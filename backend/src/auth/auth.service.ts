import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

// We store a HASH of the refresh token in the database, never the raw token.
// This way, even if the database were ever leaked, attackers couldn't use
// the stolen values to log in as anyone (the same principle as password hashing).
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  private async issueTokens(userId: string, username: string) {
    const accessToken = await this.jwt.signAsync(
      { sub: userId, username },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN'),
      },
    );

    // The refresh token is a random opaque string, NOT a JWT. This is a
    // deliberate security choice: it can't be inspected or forged, and we
    // can revoke it instantly by deleting its hash from the database.
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshExpiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '30d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.parseDays(refreshExpiresIn));

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: hashToken(refreshToken),
        userId,
        expiresAt,
      },
    });

    return { accessToken, refreshToken };
  }

  private parseDays(value: string): number {
    const match = /^(\d+)d$/.exec(value);
    return match ? parseInt(match[1], 10) : 30;
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });
    if (existing) {
      const field = existing.email === dto.email ? 'Email' : 'Username';
      throw new ConflictException(`${field} is already taken`);
    }

    // argon2 is the modern, recommended password hashing algorithm —
    // it's slow on purpose, which makes brute-force attacks impractical.
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
        displayName: dto.displayName,
      },
    });

    const tokens = await this.issueTokens(user.id, user.username);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.identifier }, { username: dto.identifier }],
      },
    });

    // We deliberately use the SAME error message whether the user doesn't
    // exist or the password is wrong. This prevents attackers from using
    // the login form to discover which usernames/emails are registered.
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.issueTokens(user.id, user.username);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async refresh(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired, please log in again');
    }

    // Rotate: revoke the old refresh token and issue a brand new pair.
    // This means a stolen refresh token can only be used once before it
    // stops working — if the real user refreshes afterward, the reuse
    // would fail, which is a strong signal of theft.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(stored.user.id, stored.user.username);
    return { user: this.sanitizeUser(stored.user), ...tokens };
  }

  async logout(refreshToken: string) {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  // Never send the password hash to the frontend, ever.
  private sanitizeUser(user: {
    id: string;
    username: string;
    email: string;
    displayName: string;
    bio: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeenAt: Date;
    createdAt: Date;
  }) {
    const { id, username, email, displayName, bio, avatarUrl, isOnline, lastSeenAt, createdAt } =
      user;
    return { id, username, email, displayName, bio, avatarUrl, isOnline, lastSeenAt, createdAt };
  }
}
