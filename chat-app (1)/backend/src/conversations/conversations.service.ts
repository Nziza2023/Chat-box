import { ForbiddenException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthorizationService } from '../authorization/authorization.service';

@Injectable()
export class ConversationsService {
  constructor(
    private prisma: PrismaService,
    private authorization: AuthorizationService,
  ) {}

  // Returns the list for the sidebar: one row per conversation the user
  // belongs to, with the other member's profile, the last message preview,
  // and an unread count — sorted by most recent activity, pinned first.
  async listForUser(userId: string) {
    const memberships = await this.prisma.conversationMember.findMany({
      where: { userId, leftAt: null },
      include: {
        conversation: {
          include: {
            members: {
              include: { user: true },
            },
          },
        },
      },
      orderBy: [{ isPinned: 'desc' }, { conversation: { lastMessageAt: 'desc' } }],
    });

    const results = await Promise.all(
      memberships.map(async (m) => {
        const otherMember = m.conversation.members.find((mem) => mem.userId !== userId);
        const clearedAt = m.clearedAt ?? new Date(0);

        const lastMessage = await this.prisma.message.findFirst({
          where: {
            conversationId: m.conversationId,
            createdAt: { gt: clearedAt },
          },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await this.prisma.message.count({
          where: {
            conversationId: m.conversationId,
            senderId: { not: userId },
            createdAt: { gt: clearedAt },
            readStates: { none: { userId, readAt: { not: null } } },
          },
        });

        return {
          id: m.conversation.id,
          type: m.conversation.type,
          isPinned: m.isPinned,
          isMuted: m.isMuted,
          otherUser: otherMember
            ? {
                id: otherMember.user.id,
                username: otherMember.user.username,
                displayName: otherMember.user.displayName,
                avatarUrl: otherMember.user.avatarUrl,
                isOnline: otherMember.user.isOnline,
                lastSeenAt: otherMember.user.lastSeenAt,
              }
            : null,
          lastMessage: lastMessage
            ? {
                content: lastMessage.isDeleted ? 'This message was deleted' : lastMessage.content,
                messageType: lastMessage.messageType,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
              }
            : null,
          unreadCount,
        };
      }),
    );

    return results;
  }

  // The one and only conversation this app will ever have: the thread
  // between the two authorized users. Safe to call as often as you like —
  // it creates the conversation once, on whichever of the two people opens
  // the app first, and simply returns the same one for the other person.
  async getOrCreateSharedConversation(userId: string) {
    const otherId = this.authorization.getOtherAuthorizedId(userId);
    if (!otherId) {
      // Shouldn't be reachable — JwtStrategy already rejects unauthorized
      // users before any controller runs — but fail loudly if it ever is.
      throw new ServiceUnavailableException(
        'AUTHORIZED_USER_IDS is not configured correctly on the server',
      );
    }
    return this.findOrCreateDirect(userId, otherId);
  }

  // Finds an existing 1-on-1 conversation between two users, or creates one.
  // This prevents duplicate conversations if the user searches for someone
  // they already have a chat with.
  async findOrCreateDirect(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new ForbiddenException('Cannot start a conversation with yourself');
    }

    // Defense in depth: even though this is normally only ever called with
    // the one other authorized user's id (see getOrCreateSharedConversation
    // and the controller below), refuse outright if asked to start a
    // conversation with anyone outside the two-person allowlist.
    if (!this.authorization.isAuthorized(userId) || !this.authorization.isAuthorized(targetUserId)) {
      throw new ForbiddenException('You can only message the other authorized user');
    }

    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
    });
    if (existing) return existing;

    return this.prisma.conversation.create({
      data: {
        type: 'DIRECT',
        members: {
          create: [{ userId }, { userId: targetUserId }],
        },
      },
    });
  }

  // Confirms the requesting user actually belongs to this conversation.
  // Every message/websocket action must call this before doing anything —
  // it's what stops User C from reading User A & B's private messages.
  async assertMembership(conversationId: string, userId: string) {
    const membership = await this.prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (!membership || membership.leftAt) {
      throw new ForbiddenException('You are not a member of this conversation');
    }
    return membership;
  }

  async togglePin(conversationId: string, userId: string) {
    const membership = await this.assertMembership(conversationId, userId);
    return this.prisma.conversationMember.update({
      where: { id: membership.id },
      data: { isPinned: !membership.isPinned },
    });
  }

  async toggleMute(conversationId: string, userId: string) {
    const membership = await this.assertMembership(conversationId, userId);
    return this.prisma.conversationMember.update({
      where: { id: membership.id },
      data: { isMuted: !membership.isMuted },
    });
  }

  // "Delete for me" at the conversation level — hides all history up to now
  // for this user only. Doesn't touch the other participant's view.
  async clearHistory(conversationId: string, userId: string) {
    const membership = await this.assertMembership(conversationId, userId);
    return this.prisma.conversationMember.update({
      where: { id: membership.id },
      data: { clearedAt: new Date() },
    });
  }

  async getConversationOrThrow(conversationId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    return conversation;
  }
}
