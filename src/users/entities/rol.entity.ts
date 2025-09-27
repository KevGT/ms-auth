import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('ROL')
export class Rol {
  @PrimaryColumn({ name: 'ID_ROL', type: 'number' })
  idRol!: number;

  @Column({ name: 'NOMBRE', length: 80 })
  nombre!: string;

  @Column({ name: 'NIVEL', length: 20 })
  nivel!: 'GLOBAL' | 'PAIS' | 'CORP';
}
