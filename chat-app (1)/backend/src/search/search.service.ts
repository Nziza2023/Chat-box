import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';

// This app is a private two-person messenger — there is no public user
// directory. "People" results here can only ever be the one other
// authorized user; this is defense in depth even though the frontend no
// longer has a discovery UI that calls this at all.
@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  async searchAll(userId: string, query: string) {
    const q = query.trim();
    if (!q) return { people: [], messages: [] };

    const otherId = this.authorization.getOtherAuthorizedId(userId);

    const [people, messages] = await Promise.all([
      otherId
        ? this.prisma.user.findMany({
            where: {
              id: otherId,
              OR: [
                { username: { contains: q, mode: 'insensitive' } },
                { displayName: { contains: q, mode: 'insensitive' } },
              ],
            },
            select: { id: true, username: true, displayName: true, avatarUrl: true, isOnline: true },
            take: 10,
          })
        : Promise.resolve([]),

      // Only search messages in conversations the user actually belongs to —
      // this is the important access-control check, not just a nice-to-have.
      this.prisma.message.findMany({
        where: {
          isDeleted: false,
          content: { contains: q, mode: 'insensitive' },
          conversation: { members: { some: { userId, leftAt: null } } },
        },
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          conversation: {
            include: {
              members: {
                where: { userId: { not: userId } },
                include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      people,
      messages: messages.map((m) => ({
        id: m.id,
        conversationId: m.conversationId,
        content: m.content,
        createdAt: m.createdAt,
        sender: m.sender,
        otherUser: m.conversation.members[0]?.user ?? null,
      })),
    };
  }
}
