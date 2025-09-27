import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('AUTH_TFA_SECRET')
export class TfaSecret {
  // La fila es 1:1 por usuario ⇒ usamos ID_USUARIO como PK
  @PrimaryColumn({ name: 'ID_USUARIO', type: 'number' })
  idUsuario!: number;

  @Column({ name: 'SECRET', type: 'varchar2' })
  secret!: string;

  @Column({
    name: 'CREATED_AT',
    type: 'timestamp',
    default: () => 'SYSTIMESTAMP',
  })
  createdAt!: Date;
}
