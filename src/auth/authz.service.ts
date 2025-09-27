import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AuthzService {
  constructor(private readonly ds: DataSource) {}

  async getRoles(idUsuario: number) {
    const sql = `
      SELECT r.ID_ROL, r.NOMBRE, r.NIVEL
      FROM USUARIO_ROL ur
      JOIN ROL r ON r.ID_ROL = ur.ID_ROL
      WHERE ur.ID_USUARIO = :idUsuario AND r.ESTADO = 'A'
      ORDER BY r.NOMBRE`;
    return this.ds.query(sql, [idUsuario]);
  }

  async getPermisos(idUsuario: number) {
    const sql = `
      SELECT DISTINCT p.ID_PERMISO, p.CODIGO, p.DESCRIPCION
      FROM USUARIO_ROL ur
      JOIN ROL_PERMISO rp ON rp.ID_ROL = ur.ID_ROL
      JOIN PERMISO p ON p.ID_PERMISO = rp.ID_PERMISO
      WHERE ur.ID_USUARIO = :idUsuario AND p.ESTADO = 'A'
      ORDER BY p.CODIGO`;
    return this.ds.query(sql, [idUsuario]);
  }

  async getMenus(idUsuario: number) {
    const menusSql = `
      SELECT DISTINCT m.ID_MENU, m.NOMBRE, m.ICONO, m.RUTA, m.MODULO, m.ORDEN
      FROM USUARIO_ROL ur
      JOIN ROL_MENU rm ON rm.ID_ROL = ur.ID_ROL
      JOIN MENU m ON m.ID_MENU = rm.ID_MENU
      WHERE ur.ID_USUARIO = :idUsuario AND m.ACTIVO = 1
      ORDER BY m.ORDEN, m.NOMBRE`;
    const menus = await this.ds.query(menusSql, [idUsuario]);

    const subSql = `
      SELECT s.ID_SUBMENU, s.ID_MENU, s.NOMBRE, s.RUTA, s.ORDEN
      FROM SUBMENU s
      WHERE s.ID_MENU IN (${menus.map(m => m.ID_MENU).concat([-1]).join(',')})
      ORDER BY s.ORDEN, s.NOMBRE`;
    const submenus = menus.length ? await this.ds.query(subSql) : [];

    // arma árbol
    const map = new Map<number, any>();
    menus.forEach(m => map.set(m.ID_MENU, { ...m, submenus: [] as any[] }));
    submenus.forEach(s => map.get(s.ID_MENU)?.submenus.push(s));
    return Array.from(map.values());
  }
}
