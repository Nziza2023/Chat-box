import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Socket } from 'socket.io';

// HTTP requests send their JWT in a header. Sockets don't have headers in the
// same way, so the frontend instead sends the token when it first connects,
// like this: io(url, { auth: { token: "..." } })
// This guard reads that token, verifies it's a real, unexpired token issued
// by our server, and attaches the user's id to the socket so every event
// handler in the gateway knows who's talking.
@Injectable()
export class WsJwtGuard implements CanActivate {
  private readonly logger = new Logger(WsJwtGuard.name);

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const client: Socket = context.switchToWs().getClient();
    const token = client.handshake.auth?.token as string | undefined;

    if (!token) {
      throw new UnauthorizedException('No auth token provided on socket connection');
    }

    try {
      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      (client.data as any).userId = payload.sub;
      (client.data as any).username = payload.username;
      return true;
    } catch (err) {
      this.logger.warn(`Rejected socket connection: invalid token`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
