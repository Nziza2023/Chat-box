'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { useMessages } from '@/hooks/useMessages';
import { PublicUser, ChatMessage } from '@/types';
import { UserAvatar } from '../ui/UserAvatar';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingDots } from './TypingDots';

export function ChatWindow({ conversationId }: { conversationId: string }) {
  const { user } = useAuth();
  const {
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
  } = useMessages(conversationId);

  const [otherUser, setOtherUser] = useState<PublicUser | null>(null);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const shouldStickToBottom = useRef(true);

  // We don't have a dedicated "GET one conversation" endpoint yet, so we
  // derive the other person's profile from the sidebar's conversation list.
  useEffect(() => {
    apiFetch<any[]>('/conversations').then((list) => {
      const conv = list.find((c) => c.id === conversationId);
      setOtherUser(conv?.otherUser ?? null);
    });
  }, [conversationId]);

  // Auto-scroll to the bottom on new messages, but only if the user was
  // already near the bottom (so it doesn't yank them down while reading history).
  useEffect(() => {
    if (shouldStickToBottom.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    shouldStickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (el.scrollTop < 80 && hasMore) {
      const prevHeight = el.scrollHeight;
      loadMore().then(() => {
        requestAnimationFrame(() => {
          if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prevHeight;
          }
        });
      });
    }
  }

  function jumpTo(messageId: string) {
    const el = document.getElementById(`msg-${messageId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-brand-500');
    setTimeout(() => el.classList.remove('ring-2', 'ring-brand-500'), 1200);
  }

  return (
    <div className="flex h-full flex-col bg-[rgb(var(--bg))]">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[rgb(var(--border))] p-3">
        <Link href="/chat" className="rounded-full p-1.5 hover:bg-[rgb(var(--bg-soft))] md:hidden">
          <ArrowLeft size={18} />
        </Link>
        {otherUser && (
          <>
            <UserAvatar
              name={otherUser.displayName}
              avatarUrl={otherUser.avatarUrl}
              size={38}
              showStatus
              online={otherUser.isOnline}
            />
            <div>
              <p className="text-sm font-semibold">{otherUser.displayName}</p>
              <p className="text-xs text-[rgb(var(--text-soft))]">
                {typingUser ? 'typing...' : otherUser.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto thin-scrollbar py-3">
        {loading && (
          <div className="flex h-full items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <p className="mt-10 text-center text-sm text-[rgb(var(--text-soft))]">
            No messages yet — say hi 👋
          </p>
        )}

        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            message={m}
            isMine={m.senderId === user?.id}
            onReply={setReplyTo}
            onEdit={setEditing}
            onDelete={deleteMessage}
            onReact={react}
            onJumpTo={jumpTo}
          />
        ))}

        {typingUser && (
          <div className="flex justify-start px-3 py-0.5">
            <TypingDots />
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <MessageInput
        replyTo={replyTo}
        editingMessage={editing}
        onCancelReply={() => setReplyTo(null)}
        onCancelEdit={() => setEditing(null)}
        onSend={(payload) => {
          sendMessage(payload);
          setReplyTo(null);
        }}
        onSubmitEdit={(id, content) => {
          editMessage(id, content);
          setEditing(null);
        }}
        onTyping={setTyping}
      />
    </div>
  );
}
