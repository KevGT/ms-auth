import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('AUTH_REFRESH_TOKEN')
export class RefreshToken {
  // en tus logs ID es un UUID que tú generas => PrimaryColumn
  @PrimaryColumn({ name: 'ID', type: 'varchar2', length: 36 })
  id!: string;

  @Column({ name: 'ID_USUARIO', type: 'number' })
  idUsuario!: number;

  @Column({ name: 'TOKEN_HASH', type: 'varchar2' })
  tokenHash!: string;

  @Column({ name: 'USER_AGENT', type: 'varchar2', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'IP', type: 'varchar2', nullable: true })
  ip!: string | null;

  @Column({ name: 'CREATED_AT', type: 'timestamp', default: () => 'SYSTIMESTAMP' })
  createdAt!: Date;

  @Column({ name: 'EXPIRES_AT', type: 'timestamp' })
  expiresAt!: Date;

  @Column({ name: 'REVOKED_AT', type: 'timestamp', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'REPLACED_BY', type: 'varchar2', length: 36, nullable: true })
  replacedBy!: string | null;
}
