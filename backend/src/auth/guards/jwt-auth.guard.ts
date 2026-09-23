import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Apply this with @UseGuards(JwtAuthGuard) above any controller or route
// that should require a logged-in user. It runs the JwtStrategy above.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
