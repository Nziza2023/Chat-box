'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useAuth } from '@/context/auth-context';
import { useToast } from '@/context/toast-context';
import { ChatMessage } from '@/types';

// Fires a toast for real incoming events — a new message in a conversation
// you're not currently looking at, or someone reacting to your message.
// Nothing here is simulated: it's the same socket events that update the
// chat UI, just also surfaced as a toast when you're elsewhere in the app.
export function useRealtimeNotifications() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    if (!user) return;
    const socket = getSocket();

    const onNewMessage = (message: ChatMessage) => {
      if (message.senderId === user.id) return;
      const isViewingThisChat = pathnameRef.current === `/chat/${message.conversationId}`;
      const isTabVisible = document.visibilityState === 'visible';
      if (isViewingThisChat && isTabVisible) return;

      const preview =
        message.messageType === 'TEXT'
          ? (message.content ?? '')
          : message.messageType === 'IMAGE'
            ? '📷 Sent a photo'
            : message.messageType === 'VIDEO'
              ? '🎥 Sent a video'
              : message.messageType === 'AUDIO'
                ? '🎤 Sent a voice message'
                : '📎 Sent a file';

      showToast({
        title: message.sender.displayName,
        description: preview,
        icon: 'message',
        onClick: () => router.push(`/chat/${message.conversationId}`),
      });
    };

    const onUpdated = (message: ChatMessage) => {
      if (!message || message.senderId !== user.id) return;
      const latestReaction = message.reactions[message.reactions.length - 1];
      if (!latestReaction || latestReaction.user.id === user.id) return;
      const isViewingThisChat = pathnameRef.current === `/chat/${message.conversationId}`;
      if (isViewingThisChat && document.visibilityState === 'visible') return;

      showToast({
        title: 'New reaction',
        description: `Someone reacted to your message`,
        icon: 'reaction',
        onClick: () => router.push(`/chat/${message.conversationId}`),
      });
    };

    socket.on('newMessage', onNewMessage);
    socket.on('messageUpdated', onUpdated);
    return () => {
      socket.off('newMessage', onNewMessage);
      socket.off('messageUpdated', onUpdated);
    };
  }, [user, showToast, router]);
}
