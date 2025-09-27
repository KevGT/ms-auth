// src/users/entities/usuario.entity.ts
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('USUARIO')
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'ID_USUARIO', type: 'number' })
  idUsuario!: number;

  @Column({ name: 'USERNAME', type: 'varchar2' })
  username!: string;

  @Column({ name: 'EMAIL', type: 'varchar2' })
  email!: string;

  @Column({ name: 'PASSWORD_HASH', type: 'varchar2' })
  passwordHash!: string;

  @Column({ name: 'TFA_HABILITADO', type: 'number', default: 0 })
  tfaHabilitado!: number;

  @Column({ name: 'ID_PAIS', type: 'number', nullable: true })
  idPais!: number | null;                 // <-- acepta null

  @Column({ name: 'ID_CORPORACION', type: 'number', nullable: true })
  idCorporacion!: number | null;          // <-- acepta null

  @Column({ name: 'ACTIVO', type: 'number', default: 1 })
  activo!: number;

  @Column({ name: 'USUARIO_CREO', type: 'varchar2' })
  usuarioCreo!: string;
}
