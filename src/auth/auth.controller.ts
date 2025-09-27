import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDto } from './dto/register.dto';
import { TfaVerifyDto } from './dto/tfa.dto';
import { UsersService } from '../users/users.service';
import * as QRCode from 'qrcode';
import { AuthzService } from './authz.service';

@Controller('auth')
export class AuthController {
  constructor(
    private auth: AuthService,
    private users: UsersService,
    private authz: AuthzService,        // <-- NUEVO
  ) {}

  // Login (LocalStrategy usa validateUser)
  @UseGuards(AuthGuard('local'))
  @Post('login')
  async login(@Req() req, @Body() _dto: LoginDto) {
    const ua = req.headers['user-agent']; const ip = req.ip;
    return this.auth.issueSession(req.user, ua, ip);
  }

  // Refresh (Bearer refresh token)
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  async refresh(@Req() req, @Headers('authorization') authz: string) {
    const refresh = (authz || '').replace(/^Bearer\s+/i, '');
    const ua = req.headers['user-agent']; const ip = req.ip;
    return this.auth.rotateRefresh(req.user.sub, refresh, ua, ip);
  }

  // Logout (revoca el refresh enviado)
  @UseGuards(JwtRefreshGuard)
  @Post('logout')
  async logout(@Req() req, @Headers('authorization') authz: string) {
    const refresh = (authz || '').replace(/^Bearer\s+/i, '');
    return this.auth.logout(req.user.sub, refresh);
  }

  // Usuario actual (protegido por access token)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return { sub: req.user.sub, username: req.user.username };
  }

  // Registro (simple; protégelo con rol/permiso en prod)
@Post('register')
async register(@Body() dto: RegisterDto, @Req() req) {
  const creador = req?.user?.username ?? 'API';
  const u = await this.users.create(
    dto.username,
    dto.email,
    dto.password,
    creador,
    dto.idPais,
    dto.idCorporacion ?? null,
  );
  return {
    id: u.idUsuario,
    username: u.username,
    email: u.email,
    idPais: u.idPais,
    idCorporacion: u.idCorporacion ?? null,
  };
}


  // Cambio de contraseña (autenticado)
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    const me = await this.users.findByUsername(req.user.username);
    const ok = await (await import('bcryptjs')).compare(dto.currentPassword, me!.passwordHash);
    if (!ok) return { ok: false, message: 'Actual no coincide' };
    await this.users.updatePassword(me!.idUsuario, dto.newPassword);
    return { ok: true };
  }

  // Forgot / Reset
@Post('forgot-password')
async forgot(@Body() dto: ForgotPasswordDto) {
  const u = await this.users.findByUsernameOrEmail(dto.usernameOrEmail);
  if (!u) return { ok: true }; // no revelar existencia

  const pr = await this.auth.createPasswordReset(u.idUsuario);
  await this.auth.sendPasswordResetEmail(u.email, pr.token); // <--- enviar

  // en dev puedes devolver el token para pruebas
  const dev = process.env.NODE_ENV !== 'production';
  return dev ? { ok: true, token: pr.token, expiresAt: pr.expiresAt } : { ok: true };
}


  @Post('reset-password')
  async reset(@Body() dto: ResetPasswordDto) {
    await this.auth.usePasswordReset(dto.token, dto.newPassword);
    return { ok: true };
  }

  // 2FA
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  async tfaEnable(@Req() req) {
    const me = { idUsuario: req.user.sub, username: req.user.username };
    const { otpauth } = await this.auth.tfaGenerate(me);
    const dataUrl = await QRCode.toDataURL(otpauth);
    return { otpauth, qrcodeDataUrl: dataUrl };
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  async tfaVerify(@Req() req, @Body() dto: TfaVerifyDto) {
    const me = { idUsuario: req.user.sub, username: req.user.username };
    return this.auth.tfaVerify(me, dto.code);
  }

  // Sesiones (refresh tokens)
  @UseGuards(JwtAuthGuard)
  @Get('sessions')
  sessions(@Req() req) {
    return this.auth.listSessions(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('sessions/revoke/:id')
  revoke(@Req() req, @Param('id') id: string) {
    return this.auth.revokeSession(req.user.sub, id);
  }

  // ====== NUEVOS ENDPOINTS DE AUTORIZACIÓN ======
  @UseGuards(JwtAuthGuard)
  @Get('roles')
  roles(@Req() req) {
    return this.authz.getRoles(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('permisos')
  permisos(@Req() req) {
    return this.authz.getPermisos(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('menus')
  menus(@Req() req) {
    return this.authz.getMenus(req.user.sub);
  }

  
}
