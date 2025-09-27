import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('USUARIO_ROL')
export class UsuarioRol {
  @PrimaryColumn({ name: 'ID_USUARIO', type: 'number' })
  idUsuario!: number;

  @PrimaryColumn({ name: 'ID_ROL', type: 'number' })
  idRol!: number;
}
