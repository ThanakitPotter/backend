import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string; // user id
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  /**
   * Called after token is validated. The return value is attached to `request.user`.
   * This is the core mechanism for data isolation — every protected route
   * can access `req.user.userId` to scope queries to the authenticated user.
   */
  validate(payload: JwtPayload) {
    return { userId: payload.sub, email: payload.email };
  }
}
