import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  isOnline: true,
  lastSeenAt: true,
  createdAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ...PUBLIC_USER_SELECT, email: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: { ...PUBLIC_USER_SELECT, email: true },
    });
  }

  // This is now a private two-person app — there is no "find anyone" search
  // anymore. This method can only ever return the one other authorized
  // user, and only if their name/username actually matches the query. This
  // is a defense-in-depth check (the frontend no longer calls this at all);
  // even a direct API call can't be used to enumerate other accounts.
  async searchUsers(query: string, excludeUserId: string) {
    if (!query || query.trim().length === 0) return [];
    const otherId = this.authorization.getOtherAuthorizedId(excludeUserId);
    if (!otherId) return [];

    return this.prisma.user.findMany({
      where: {
        id: otherId,
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: PUBLIC_USER_SELECT,
      take: 20,
    });
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { isOnline, lastSeenAt: new Date() },
      select: PUBLIC_USER_SELECT,
    });
  }
}
