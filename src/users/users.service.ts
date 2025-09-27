import * as bcrypt from 'bcryptjs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Usuario } from './entities/usuario.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Usuario) private usersRepo: Repository<Usuario>,
    private readonly ds: DataSource,
  ) {}

  findByUsername(username: string) {
    return this.usersRepo.findOne({ where: { username } });
  }

  private async assertUsernameEmailUnique(username: string, email: string) {
    const rowU = await this.ds.query(
      `SELECT 1 FROM USUARIO WHERE USERNAME = :1`,
      [username],
    );
    if (rowU?.length) {
      throw new ConflictException(`USERNAME ya existe: ${username}`);
    }
    const rowE = await this.ds.query(
      `SELECT 1 FROM USUARIO WHERE EMAIL = :1`,
      [email],
    );
    if (rowE?.length) {
      throw new ConflictException(`EMAIL ya existe: ${email}`);
    }
  }

  private async assertPaisExiste(idPais: number) {
    const rows = await this.ds.query(
      `SELECT 1 FROM PAIS WHERE ID_PAIS = :1`,
      [idPais],
    );
    if (!rows?.length) {
      throw new BadRequestException(`ID_PAIS inexistente: ${idPais}`);
    }
  }

  private async assertCorporacionExiste(idCorporacion?: number) {
    if (idCorporacion == null) return; // opcional
    const rows = await this.ds.query(
      `SELECT 1 FROM CORPORACION WHERE ID_CORPORACION = :1`,
      [idCorporacion],
    );
    if (!rows?.length) {
      throw new BadRequestException(
        `ID_CORPORACION inexistente: ${idCorporacion}`,
      );
    }
  }

  async create(
    username: string,
    email: string,
    plainPassword: string,
    creador = 'API',
    idPais?: number,
    idCorporacion?: number | null,
  ) {
    if (idPais == null) throw new BadRequestException('idPais es requerido');

    await this.assertUsernameEmailUnique(username, email);
    await this.assertPaisExiste(idPais);
    await this.assertCorporacionExiste(idCorporacion ?? undefined);

    const passwordHash = await bcrypt.hash(plainPassword, 10);

    const u = this.usersRepo.create({
      username,
      email,
      passwordHash,
      tfaHabilitado: 0,
      activo: 1,
      usuarioCreo: creador,
      idPais,
      idCorporacion: idCorporacion ?? null,
    });

    return this.usersRepo.save(u);
  }

  async updatePassword(idUsuario: number, newPlain: string) {
    const user = await this.usersRepo.findOne({ where: { idUsuario } });
    if (!user) return null;
    user.passwordHash = await bcrypt.hash(newPlain, 10);
    return this.usersRepo.save(user);
  }
  async setTfaEnabled(idUsuario: number, enabled: boolean) {
  await this.usersRepo.update({ idUsuario }, { tfaHabilitado: enabled ? 1 : 0 });
}

// (opcional) buscar por username o email para forgot
async findByUsernameOrEmail(usernameOrEmail: string) {
  return this.usersRepo.findOne({
    where: [{ username: usernameOrEmail }, { email: usernameOrEmail }],
  });
}
}
