import { Injectable } from '@nestjs/common';

// A user might have the chat open in two browser tabs at once. We only want
// to tell everyone else "this user went offline" once ALL of their tabs have
// closed — not the moment the first tab closes. So instead of a simple
// boolean, we keep a Set of socket ids per user, and only flip to "offline"
// when that set becomes empty.
@Injectable()
export class PresenceService {
  private onlineUsers = new Map<string, Set<string>>();

  addConnection(userId: string, socketId: string): boolean {
    const wasOffline = !this.onlineUsers.has(userId);
    const sockets = this.onlineUsers.get(userId) ?? new Set();
    sockets.add(socketId);
    this.onlineUsers.set(userId, sockets);
    return wasOffline; // true = this is their first tab, they just came online
  }

  removeConnection(userId: string, socketId: string): boolean {
    const sockets = this.onlineUsers.get(userId);
    if (!sockets) return false;
    sockets.delete(socketId);
    if (sockets.size === 0) {
      this.onlineUsers.delete(userId);
      return true; // true = their last tab closed, they just went offline
    }
    return false;
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }
}
