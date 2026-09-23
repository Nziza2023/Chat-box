'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { PublicUser } from '@/types';
import { UserAvatar } from '../ui/UserAvatar';

export function NewChatModal({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PublicUser[]>([]);
  const [starting, setStarting] = useState<string | null>(null);
  const router = useRouter();

  // Debounced search: wait 300ms after the user stops typing before calling
  // the backend, so we don't fire a request on every single keystroke.
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const data = await apiFetch<PublicUser[]>(`/users/search?q=${encodeURIComponent(query)}`);
      setResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  async function startChat(userId: string) {
    setStarting(userId);
    try {
      const conversation = await apiFetch<{ id: string }>('/conversations', {
        method: 'POST',
        body: JSON.stringify({ targetUserId: userId }),
      });
      onClose();
      router.push(`/chat/${conversation.id}`);
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-[rgb(var(--bg))] p-4 shadow-xl animate-pop-in">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">New conversation</h2>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-[rgb(var(--bg-soft))]">
            <X size={18} />
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-soft))]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username or name..."
            className="w-full rounded-lg border border-[rgb(var(--border))] bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div className="max-h-72 overflow-y-auto thin-scrollbar">
          {results.length === 0 && query.trim() && (
            <p className="py-6 text-center text-sm text-[rgb(var(--text-soft))]">No users found</p>
          )}
          {results.map((u) => (
            <button
              key={u.id}
              onClick={() => startChat(u.id)}
              disabled={starting === u.id}
              className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-[rgb(var(--bg-soft))] disabled:opacity-60"
            >
              <UserAvatar name={u.displayName} avatarUrl={u.avatarUrl} size={38} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{u.displayName}</p>
                <p className="truncate text-xs text-[rgb(var(--text-soft))]">@{u.username}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
