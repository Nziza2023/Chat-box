'use client';

import { useEffect, useState, useCallback } from 'react';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ConversationSummary, ChatMessage } from '@/types';
import { useAuth } from '@/context/auth-context';

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await apiFetch<ConversationSummary[]>('/conversations');
    setConversations(data);
  }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [user, reload]);

  // Live updates: whenever a message arrives anywhere, bump that
  // conversation to the top and refresh its preview + unread count,
  // instead of re-fetching the entire list every time.
  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const handleNewMessage = (message: ChatMessage) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === message.conversationId);
        if (idx === -1) {
          reload();
          return prev;
        }
        const updated = [...prev];
        const conv = { ...updated[idx] };
        conv.lastMessage = {
          content: message.content,
          messageType: message.messageType,
          createdAt: message.createdAt,
          senderId: message.senderId,
        };
        if (message.senderId !== user.id) conv.unreadCount += 1;
        updated.splice(idx, 1);
        updated.unshift(conv);
        return updated;
      });
    };

    const handlePresence = ({ userId, isOnline }: { userId: string; isOnline: boolean }) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.otherUser?.id === userId ? { ...c, otherUser: { ...c.otherUser!, isOnline } } : c,
        ),
      );
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('userPresenceChanged', handlePresence);
    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userPresenceChanged', handlePresence);
    };
  }, [user, reload]);

  const clearUnread = useCallback((conversationId: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    );
  }, []);

  return { conversations, loading, reload, clearUnread };
}
