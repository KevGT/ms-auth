// src/auth/strategies/jwt-refresh.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true, // para recuperar el RT del header
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: any) {
    // opcional: inyectar el refresh en el req.user
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    return { ...payload, refreshToken: token };
  }
}
