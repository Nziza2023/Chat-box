'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { apiFetch } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { ChatMessage } from '@/types';
import { useAuth } from '@/context/auth-context';

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load the most recent page of history whenever we switch conversations
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    setLoading(true);
    setMessages([]);
    setHasMore(true);

    apiFetch<ChatMessage[]>(`/conversations/${conversationId}/messages`).then((data) => {
      if (cancelled) return;
      setMessages(data);
      setHasMore(data.length === 30);
      setLoading(false);
    });

    const socket = getSocket();
    socket.emit('joinConversation', { conversationId });
    socket.emit('markRead', { conversationId });

    return () => {
      cancelled = true;
      socket.emit('leaveConversation', { conversationId });
    };
  }, [conversationId]);

  // Older-message pagination for infinite scroll upward
  const loadMore = useCallback(async () => {
    if (!conversationId || messages.length === 0) return;
    const oldest = messages[0];
    const older = await apiFetch<ChatMessage[]>(
      `/conversations/${conversationId}/messages?cursor=${oldest.id}`,
    );
    setMessages((prev) => [...older, ...prev]);
    setHasMore(older.length === 30);
  }, [conversationId, messages]);

  // Real-time listeners
  useEffect(() => {
    if (!conversationId) return;
    const socket = getSocket();

    const onNewMessage = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => [...prev, message]);
      if (message.senderId !== user?.id) {
        socket.emit('markRead', { conversationId });
      }
    };

    const onMessageUpdated = (message: ChatMessage) => {
      if (message.conversationId !== conversationId) return;
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    };

    const onMessageDeleted = ({ messageId, conversationId: cid }: any) => {
      if (cid !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isDeleted: true, content: null } : m)),
      );
    };

    const onRead = ({ conversationId: cid }: any) => {
      if (cid !== conversationId) return;
      setMessages((prev) => prev.map((m) => ({ ...m, status: 'read' as const })));
    };

    const onTyping = ({ conversationId: cid, userId, isTyping }: any) => {
      if (cid !== conversationId || userId === user?.id) return;
      setTypingUser(isTyping ? userId : null);
      if (typingTimeout.current) clearTimeout(typingTimeout.current);
      if (isTyping) {
        // Safety net: auto-clear if a "stopped typing" event ever gets lost
        typingTimeout.current = setTimeout(() => setTypingUser(null), 4000);
      }
    };

    socket.on('newMessage', onNewMessage);
    socket.on('messageUpdated', onMessageUpdated);
    socket.on('messageDeleted', onMessageDeleted);
    socket.on('messageRead', onRead);
    socket.on('userTyping', onTyping);

    return () => {
      socket.off('newMessage', onNewMessage);
      socket.off('messageUpdated', onMessageUpdated);
      socket.off('messageDeleted', onMessageDeleted);
      socket.off('messageRead', onRead);
      socket.off('userTyping', onTyping);
    };
  }, [conversationId, user?.id]);

  const sendMessage = useCallback(
    (payload: { content?: string; messageType?: string; replyToId?: string; attachment?: any }) => {
      if (!conversationId) return;
      const socket = getSocket();
      socket.emit('sendMessage', { conversationId, ...payload });
    },
    [conversationId],
  );

  const editMessage = useCallback((messageId: string, content: string) => {
    getSocket().emit('editMessage', { messageId, content });
  }, []);

  const deleteMessage = useCallback((messageId: string) => {
    getSocket().emit('deleteMessage', { messageId });
  }, []);

  const react = useCallback((messageId: string, emoji: string) => {
    getSocket().emit('messageReaction', { messageId, emoji });
  }, []);

  const setTyping = useCallback(
    (isTyping: boolean) => {
      if (!conversationId) return;
      getSocket().emit(isTyping ? 'typingStart' : 'typingStop', { conversationId });
    },
    [conversationId],
  );

  return {
    messages,
    loading,
    hasMore,
    loadMore,
    typingUser,
    sendMessage,
    editMessage,
    deleteMessage,
    react,
    setTyping,
  };
}
