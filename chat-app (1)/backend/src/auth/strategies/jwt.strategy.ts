import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthorizationService } from '../../authorization/authorization.service';

// This runs automatically whenever a route is protected with @UseGuards(JwtAuthGuard).
// It reads the "Authorization: Bearer <token>" header, verifies the signature
// and expiry using JWT_ACCESS_SECRET, and if valid, attaches the returned
// object below to `request.user` so controllers can read the logged-in user's id.
//
// This is also THE single choke point for the two-person lockdown on the
// REST API: every protected route in the app runs through this `validate`
// method before its controller ever executes, so checking the allowlist
// here — rather than scattered across individual controllers — guarantees
// no protected route can be reached by anyone outside the two authorized
// users, even one we forget to add a check to later.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private authorization: AuthorizationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: { sub: string; username: string }) {
    if (!this.authorization.isAuthorized(payload.sub)) {
      throw new UnauthorizedException('This account is not authorized to use this application');
    }
    // Whatever we return here becomes `request.user`
    return { userId: payload.sub, username: payload.username };
  }
}
