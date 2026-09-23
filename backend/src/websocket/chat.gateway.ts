import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { PresenceService } from './presence.service';
import { MessagesService } from '../messages/messages.service';
import { ConversationsService } from '../conversations/conversations.service';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';

// ============================================================================
// HOW THIS FILE FITS IN:
// The frontend opens ONE socket connection per browser tab (see socket.ts in
// the frontend). Every real-time feature — new messages, typing dots, online
// status, read receipts — flows through THIS single gateway as named
// "events". Each @SubscribeMessage('eventName') below is one event the
// frontend can send us, and every this.server.to(...).emit(...) call is an
// event we send back out to one or more connected browsers.
// ============================================================================

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
    private presence: PresenceService,
    private messagesService: MessagesService,
    private conversationsService: ConversationsService,
    private usersService: UsersService,
    private prisma: PrismaService,
  ) {}

  // Runs automatically the instant a browser tab opens a socket connection.
  // We manually verify the token here (instead of only relying on a guard)
  // because a failed connection needs to be disconnected immediately.
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('No token');

      const payload = this.jwt.verify(token, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      });
      const userId = payload.sub as string;
      (client.data as any).userId = userId;

      // Put this socket into a private "room" named after the user's id.
      // This lets us later send an event to "every tab this user has open"
      // just by emitting to room `user:<id>` instead of tracking socket ids.
      client.join(`user:${userId}`);

      // Also join a room for every conversation this user is part of, so
      // sendMessage/typing/reactions reach them without extra round trips.
      const memberships = await this.prisma.conversationMember.findMany({
        where: { userId, leftAt: null },
        select: { conversationId: true },
      });
      memberships.forEach((m) => client.join(`conversation:${m.conversationId}`));

      const justCameOnline = this.presence.addConnection(userId, client.id);
      if (justCameOnline) {
        await this.usersService.setOnlineStatus(userId, true);
        this.broadcastPresence(userId, true);
      }

      this.logger.log(`Socket connected: user ${userId} (${client.id})`);
    } catch (err) {
      this.logger.warn(`Rejected unauthenticated socket connection`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = (client.data as any)?.userId;
    if (!userId) return;

    const justWentOffline = this.presence.removeConnection(userId, client.id);
    if (justWentOffline) {
      await this.usersService.setOnlineStatus(userId, false);
      this.broadcastPresence(userId, false);
    }
    this.logger.log(`Socket disconnected: user ${userId} (${client.id})`);
  }

  private broadcastPresence(userId: string, isOnline: boolean) {
    // Broadcast to everyone — the frontend only updates UI for users it
    // actually has a conversation with, so this is simple and safe.
    this.server.emit('userPresenceChanged', {
      userId,
      isOnline,
      lastSeenAt: new Date(),
    });
  }

  // ---------------------------------------------------------------------
  // JOIN / LEAVE a specific conversation "room" — used when the frontend
  // opens a chat, mostly as a safety net alongside the auto-join on connect.
  // ---------------------------------------------------------------------

  @SubscribeMessage('joinConversation')
  async handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = (client.data as any).userId;
    await this.conversationsService.assertMembership(data.conversationId, userId);
    client.join(`conversation:${data.conversationId}`);
  }

  @SubscribeMessage('leaveConversation')
  handleLeave(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string }) {
    client.leave(`conversation:${data.conversationId}`);
  }

  // ---------------------------------------------------------------------
  // SEND MESSAGE
  // Flow: User presses Send → frontend emits 'sendMessage' → we validate +
  // save to the database via MessagesService → we emit 'newMessage' to
  // everyone in that conversation's room (including the sender's OTHER
  // tabs, so their message appears everywhere instantly too).
  // ---------------------------------------------------------------------

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      conversationId: string;
      content?: string;
      messageType?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
      replyToId?: string;
      attachment?: any;
    },
  ) {
    const userId = (client.data as any).userId;
    const message = await this.messagesService.send(userId, data as any);

    this.server.to(`conversation:${data.conversationId}`).emit('newMessage', message);

    // Immediately mark as "delivered" for anyone currently online in that room
    await this.messagesService.markDelivered(userId, message.id);
    this.server.to(`conversation:${data.conversationId}`).emit('messageDelivered', {
      messageId: message.id,
      conversationId: data.conversationId,
    });

    return message; // also ack back to the sender directly, for instant local UI update
  }

  // ---------------------------------------------------------------------
  // EDIT / DELETE
  // ---------------------------------------------------------------------

  @SubscribeMessage('editMessage')
  async handleEdit(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; content: string },
  ) {
    const userId = (client.data as any).userId;
    const message = await this.messagesService.edit(userId, data.messageId, data.content);
    this.server.to(`conversation:${message.conversationId}`).emit('messageUpdated', message);
    return message;
  }

  @SubscribeMessage('deleteMessage')
  async handleDelete(@ConnectedSocket() client: Socket, @MessageBody() data: { messageId: string }) {
    const userId = (client.data as any).userId;
    const message = await this.messagesService.deleteForEveryone(userId, data.messageId);
    this.server.to(`conversation:${message.conversationId}`).emit('messageDeleted', {
      messageId: message.id,
      conversationId: message.conversationId,
    });
    return message;
  }

  // ---------------------------------------------------------------------
  // REACTIONS
  // ---------------------------------------------------------------------

  @SubscribeMessage('messageReaction')
  async handleReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; emoji: string },
  ) {
    const userId = (client.data as any).userId;
    const message = await this.messagesService.react(userId, data.messageId, { emoji: data.emoji });
    this.server.to(`conversation:${message!.conversationId}`).emit('messageUpdated', message);
    return message;
  }

  // ---------------------------------------------------------------------
  // READ RECEIPTS — frontend calls this when the chat window is focused/open
  // ---------------------------------------------------------------------

  @SubscribeMessage('markRead')
  async handleMarkRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = (client.data as any).userId;
    const result = await this.messagesService.markConversationRead(userId, data.conversationId);
    this.server.to(`conversation:${data.conversationId}`).emit('messageRead', {
      conversationId: data.conversationId,
      readByUserId: userId,
      messageIds: result.updatedMessageIds,
    });
  }

  // ---------------------------------------------------------------------
  // TYPING INDICATOR
  // We deliberately do NOT touch the database for typing — it's purely a
  // live, in-memory signal broadcast straight to the other person's socket.
  // ---------------------------------------------------------------------

  @SubscribeMessage('typingStart')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = (client.data as any).userId;
    client.to(`conversation:${data.conversationId}`).emit('userTyping', {
      conversationId: data.conversationId,
      userId,
      isTyping: true,
    });
  }

  @SubscribeMessage('typingStop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    const userId = (client.data as any).userId;
    client.to(`conversation:${data.conversationId}`).emit('userTyping', {
      conversationId: data.conversationId,
      userId,
      isTyping: false,
    });
  }
}
