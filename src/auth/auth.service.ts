import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, IsNull } from 'typeorm';
import { RefreshToken } from './entities/refresh-token.entity';
import { TfaSecret } from './entities/tfa-secret.entity';
import { authenticator } from 'otplib';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from '../mail/mail.service';


@Injectable()
export class AuthService {
  constructor(
    private users: UsersService,
    private jwt: JwtService,
    private readonly mail: MailService,
    @InjectRepository(RefreshToken) private rtRepo: Repository<RefreshToken>,
    @InjectRepository(TfaSecret) private tfaRepo: Repository<TfaSecret>,
    
  ) {}

  async validateUser(username: string, plain: string) {
    const user = await this.users.findByUsername(username);
    if (!user || user.activo === 0) return null;
    const ok = await bcrypt.compare(plain, user.passwordHash);
    return ok ? user : null;
  }

  private async signTokens(user: { idUsuario: number; username: string }) {
    const payload = { sub: user.idUsuario, username: user.username };
    const access_token = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
    const refresh_raw = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
    return { access_token, refresh_raw };
  }

  async issueSession(user: any, ua?: string, ip?: string) {
    const { access_token, refresh_raw } = await this.signTokens(user);
    const id = uuidv4();
    const tokenHash = await bcrypt.hash(refresh_raw, 10);
    const expiresAt = new Date(Date.now() + this.parseMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d'));
    await this.rtRepo.save({ id, idUsuario: user.idUsuario, tokenHash, userAgent: ua, ip, expiresAt });
    return { access_token, refresh_token: refresh_raw };
  }

  private parseMs(s: string) {
    // '7d' '15m' '1h'
    const m = s.match(/^(\d+)([smhd])$/i);
    if (!m) return 7 * 24 * 60 * 60 * 1000;
    const n = parseInt(m[1], 10);
    const mul = { s: 1, m: 60, h: 3600, d: 86400 }[m[2].toLowerCase() as 's'|'m'|'h'|'d']!;
    return n * mul * 1000;
  }

  async rotateRefresh(userId: number, oldToken: string, ua?: string, ip?: string) {
   const sessions = await this.rtRepo.find({
  where: { idUsuario: userId, revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
});
    const match = await this.findMatchingSession(sessions, oldToken);
    if (!match) throw new UnauthorizedException('Refresh inválido');
    // revoke old
    match.revokedAt = new Date();
    await this.rtRepo.save(match);
    // issue new
    const { access_token, refresh_raw } = await this.signTokens({ idUsuario: userId, username: '' as any });
    const id = uuidv4();
    const tokenHash = await bcrypt.hash(refresh_raw, 10);
    const expiresAt = new Date(Date.now() + this.parseMs(process.env.JWT_REFRESH_EXPIRES_IN || '7d'));
    await this.rtRepo.save({ id, idUsuario: userId, tokenHash, userAgent: ua, ip, expiresAt, replacedBy: id });
    return { access_token, refresh_token: refresh_raw };
  }

  private async findMatchingSession(rows: RefreshToken[], raw: string) {
    for (const r of rows) {
      if (await bcrypt.compare(raw, r.tokenHash)) return r;
    }
    return null;
  }

  async logout(userId: number, refreshRaw: string) {
const sessions = await this.rtRepo.find({ where: { idUsuario: userId, revokedAt: IsNull() } });    const match = await this.findMatchingSession(sessions, refreshRaw);
    if (match) { match.revokedAt = new Date(); await this.rtRepo.save(match); }
    return { ok: true };
  }

  async listSessions(userId: number) {
    return this.rtRepo.find({ where: { idUsuario: userId }, order: { createdAt: 'DESC' } });
  }

  async revokeSession(userId: number, id: string) {
    const s = await this.rtRepo.findOne({ where: { id, idUsuario: userId } });
    if (!s) return { ok: false };
    s.revokedAt = new Date();
    await this.rtRepo.save(s);
    return { ok: true };
  }

  // 2FA (TOTP)
  async tfaGenerate(user: any) {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.username, 'PortalClientes', secret);
    await this.tfaRepo.save({ idUsuario: user.idUsuario, secret });
    return { otpauth }; // el controller devolverá QR
  }

async tfaVerify(user: any, code: string) {
  const rec = await this.tfaRepo.findOne({ where: { idUsuario: user.idUsuario } });
  if (!rec) throw new UnauthorizedException('2FA no inicializado');

  const ok = authenticator.verify({ token: code, secret: rec.secret });
  if (!ok) throw new UnauthorizedException('Código inválido');

  await this.users.setTfaEnabled(user.idUsuario, true);   // <--- persistir

  // opcional: borrar el secreto o dejarlo
  // await this.tfaRepo.delete({ idUsuario: user.idUsuario });

  return { ok: true };
}


  // Password reset (flujo simple en BD; puedes enviar email con nodemailer)
  async createPasswordReset(userId: number) {
    const token = uuidv4().replace(/-/g, '');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1h
    await (this.rtRepo.manager.query as any)(
      `INSERT INTO AUTH_PASSWORD_RESET (TOKEN, ID_USUARIO, EXPIRES_AT) VALUES (:1, :2, :3)`,
      [token, userId, expires],
    );
    return { token, expiresAt: expires };
  }

  async usePasswordReset(token: string, newPassword: string) {
    const rows = await (this.rtRepo.manager.query as any)(
      `SELECT ID_USUARIO, EXPIRES_AT, USED_AT FROM AUTH_PASSWORD_RESET WHERE TOKEN=:1`, [token]);
    if (!rows?.length) throw new UnauthorizedException('Token inválido');
    const row = rows[0];
    if (row.USED_AT) throw new UnauthorizedException('Token usado');
    if (new Date(row.EXPIRES_AT) < new Date()) throw new UnauthorizedException('Token expirado');
    await this.users.updatePassword(row.ID_USUARIO, newPassword);
    await (this.rtRepo.manager.query as any)(
      `UPDATE AUTH_PASSWORD_RESET SET USED_AT = SYSTIMESTAMP WHERE TOKEN=:1`, [token]);
    return { ok: true };
  }

    async sendPasswordResetEmail(to: string, token: string) {
    const url = `${process.env.RESET_BASE_URL ?? 'http://localhost:5173/reset-password'}?token=${encodeURIComponent(token)}`;
    await this.mail.send(
      to,
      'Restablecer contraseña',
      `<p>Haz clic para restablecer tu contraseña:</p><p><a href="${url}">${url}</a></p>`
    );
  }
}
