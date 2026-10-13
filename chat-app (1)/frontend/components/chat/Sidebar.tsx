'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatDistanceToNowStrict } from 'date-fns';
import { Pin, BellOff } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useConversations } from '@/hooks/useConversations';
import { UserAvatar } from '../ui/UserAvatar';
import { ThemeToggle } from '../ui/ThemeToggle';

// This is a private two-person messenger: there is exactly one conversation,
// and no way to start another one. No search box, no "new chat" button, no
// user directory — those were social-app features that don't belong here.
export function Sidebar() {
  const { user, logout } = useAuth();
  const { conversations, loading } = useConversations();
  const params = useParams();
  const activeId = params?.id as string | undefined;

  return (
    <div className="flex h-full w-full flex-col border-r border-[rgb(var(--border))] bg-[rgb(var(--bg))]">
      {/* Header: my profile + actions */}
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex min-w-0 items-center gap-2">
          <UserAvatar name={user?.displayName ?? ''} avatarUrl={user?.avatarUrl} size={38} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.displayName}</p>
            <p className="truncate text-xs text-[rgb(var(--text-soft))]">@{user?.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto thin-scrollbar px-2 pb-3">
        {loading && (
          <div className="space-y-2 p-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg p-2">
                <div className="h-11 w-11 animate-pulse rounded-full bg-[rgb(var(--bg-soft))]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-[rgb(var(--bg-soft))]" />
                  <div className="h-3 w-1/3 animate-pulse rounded bg-[rgb(var(--bg-soft))]" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <p className="mt-10 text-center text-sm text-[rgb(var(--text-soft))]">
            Starting your private conversation...
          </p>
        )}

        {conversations.map((c) => {
          const isActive = c.id === activeId;
          const preview = !c.lastMessage
            ? 'Say hello 👋'
            : c.lastMessage.messageType === 'TEXT'
              ? c.lastMessage.content
              : c.lastMessage.messageType === 'IMAGE'
                ? '📷 Photo'
                : c.lastMessage.messageType === 'VIDEO'
                  ? '🎥 Video'
                  : c.lastMessage.messageType === 'AUDIO'
                    ? '🎤 Voice message'
                    : '📎 File';

          return (
            <Link
              key={c.id}
              href={`/chat/${c.id}`}
              className={`mb-1 flex items-center gap-3 rounded-xl p-2 transition ${
                isActive ? 'bg-brand-50 dark:bg-brand-700/20' : 'hover:bg-[rgb(var(--bg-soft))]'
              }`}
            >
              <UserAvatar
                name={c.otherUser?.displayName ?? '?'}
                avatarUrl={c.otherUser?.avatarUrl}
                size={44}
                showStatus
                online={c.otherUser?.isOnline}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium">{c.otherUser?.displayName}</p>
                  {c.lastMessage && (
                    <span className="shrink-0 text-[11px] text-[rgb(var(--text-soft))]">
                      {formatDistanceToNowStrict(new Date(c.lastMessage.createdAt))}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-[rgb(var(--text-soft))]">{preview}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    {c.isMuted && <BellOff size={12} className="text-[rgb(var(--text-soft))]" />}
                    {c.isPinned && <Pin size={12} className="text-[rgb(var(--text-soft))]" />}
                    {c.unreadCount > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-medium text-white">
                        {c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-[rgb(var(--border))] p-3">
        <button
          onClick={logout}
          className="w-full rounded-lg py-2 text-center text-sm font-medium text-red-500 transition hover:bg-red-500/10"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
