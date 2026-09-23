import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

// This runs automatically whenever a route is protected with @UseGuards(JwtAuthGuard).
// It reads the "Authorization: Bearer <token>" header, verifies the signature
// and expiry using JWT_ACCESS_SECRET, and if valid, attaches the returned
// object below to `request.user` so controllers can read the logged-in user's id.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: { sub: string; username: string }) {
    // Whatever we return here becomes `request.user`
    return { userId: payload.sub, username: payload.username };
  }
}
