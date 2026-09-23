import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { SendMessageDto } from './dto/send-message.dto';
import { ReactMessageDto } from './dto/react-message.dto';

const MESSAGE_INCLUDE = {
  sender: {
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  },
  attachments: true,
  reactions: {
    include: { user: { select: { id: true, username: true } } },
  },
  replyTo: {
    include: {
      sender: { select: { id: true, username: true, displayName: true } },
    },
  },
};

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private conversations: ConversationsService,
  ) {}

  // Cursor-based pagination: the frontend sends the id of the oldest message
  // it currently has, and we return the next 30 messages older than that.
  // This is what powers "infinite scroll" without ever loading the whole history.
  async getHistory(conversationId: string, userId: string, cursor?: string, take = 30) {
    const membership = await this.conversations.assertMembership(conversationId, userId);
    const clearedAt = membership.clearedAt ?? new Date(0);

    const messages = await this.prisma.message.findMany({
      where: {
        conversationId,
        createdAt: { gt: clearedAt },
        ...(cursor ? { createdAt: { lt: (await this.getCreatedAt(cursor)) ?? new Date() } } : {}),
      },
      include: MESSAGE_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take,
    });

    return messages.reverse();
  }

  private async getCreatedAt(messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    return message?.createdAt ?? null;
  }

  async send(userId: string, dto: SendMessageDto) {
    await this.conversations.assertMembership(dto.conversationId, userId);

    if (dto.replyToId) {
      const original = await this.prisma.message.findUnique({ where: { id: dto.replyToId } });
      if (!original || original.conversationId !== dto.conversationId) {
        throw new NotFoundException('Original message not found in this conversation');
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId: dto.conversationId,
        senderId: userId,
        content: dto.content ?? null,
        messageType: dto.messageType ?? 'TEXT',
        replyToId: dto.replyToId ?? null,
        attachments: dto.attachment
          ? {
              create: {
                url: dto.attachment.url,
                fileName: dto.attachment.fileName,
                mimeType: dto.attachment.mimeType,
                sizeBytes: dto.attachment.sizeBytes,
                width: dto.attachment.width,
                height: dto.attachment.height,
                durationSeconds: dto.attachment.durationSeconds,
              },
            }
          : undefined,
      },
      include: MESSAGE_INCLUDE,
    });

    await this.prisma.conversation.update({
      where: { id: dto.conversationId },
      data: { lastMessageAt: message.createdAt },
    });

    // Pre-create a "delivered" read-state row for the other member(s) so
    // unread counts and delivered/read ticks work from message zero.
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId: dto.conversationId, userId: { not: userId }, leftAt: null },
    });
    if (members.length > 0) {
      await this.prisma.messageReadState.createMany({
        data: members.map((m) => ({ messageId: message.id, userId: m.userId })),
      });
    }

    return message;
  }

  // Only the message's own sender can edit it — enforced here, not just in the UI.
  async edit(userId: string, messageId: string, content: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages');
    }
    if (message.isDeleted) {
      throw new ForbiddenException('Cannot edit a deleted message');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content, editedAt: new Date() },
      include: MESSAGE_INCLUDE,
    });
  }

  // "Delete for everyone": only the sender can do this. The message becomes
  // a tombstone — content is wiped and isDeleted is set — but the row stays
  // in the database so message order and reply chains don't break.
  // ("Delete for me" is a smaller, per-user hide and is a natural follow-up
  // feature once group chats are added — for a 1:1 chat, deleting for
  // everyone covers the common case.)
  async deleteForEveryone(userId: string, messageId: string) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    return this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true, deletedAt: new Date(), content: null },
      include: MESSAGE_INCLUDE,
    });
  }

  async react(userId: string, messageId: string, dto: ReactMessageDto) {
    const message = await this.prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    await this.conversations.assertMembership(message.conversationId, userId);

    // Toggle: reacting with the same emoji twice removes it.
    const existing = await this.prisma.messageReaction.findUnique({
      where: { messageId_userId_emoji: { messageId, userId, emoji: dto.emoji } },
    });

    if (existing) {
      await this.prisma.messageReaction.delete({ where: { id: existing.id } });
    } else {
      await this.prisma.messageReaction.create({
        data: { messageId, userId, emoji: dto.emoji },
      });
    }

    return this.prisma.message.findUnique({
      where: { id: messageId },
      include: MESSAGE_INCLUDE,
    });
  }

  async markDelivered(userId: string, messageId: string) {
    return this.prisma.messageReadState.updateMany({
      where: { messageId, userId, deliveredAt: null },
      data: { deliveredAt: new Date() },
    });
  }

  // Marks every unread message in a conversation as read up to "now" —
  // this is what the frontend calls when the user opens/focuses a chat.
  async markConversationRead(userId: string, conversationId: string) {
    await this.conversations.assertMembership(conversationId, userId);

    const unread = await this.prisma.message.findMany({
      where: { conversationId, senderId: { not: userId } },
      select: { id: true },
    });
    const ids = unread.map((m) => m.id);
    if (ids.length === 0) return { updatedMessageIds: [] as string[] };

    await this.prisma.messageReadState.updateMany({
      where: { messageId: { in: ids }, userId, readAt: null },
      data: { readAt: new Date(), deliveredAt: new Date() },
    });

    return { updatedMessageIds: ids };
  }

  async getMessageConversationId(messageId: string) {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    if (!message) throw new NotFoundException('Message not found');
    return message.conversationId;
  }
}
