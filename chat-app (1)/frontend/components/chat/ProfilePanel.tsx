'use client';

import { useEffect, useState } from 'react';
import { X, Search, Image as ImageIcon, Star, Download } from 'lucide-react';
import { apiFetch, API_URL } from '@/lib/api';
import { ChatMessage, PublicUser } from '@/types';
import { UserAvatar } from '../ui/UserAvatar';

const FILE_ORIGIN = API_URL.replace(/\/api$/, '');

type Tab = 'media' | 'starred';

interface Props {
  conversationId: string;
  otherUser: PublicUser;
  onClose: () => void;
  onJumpTo: (messageId: string) => void;
}

export function ProfilePanel({ conversationId, otherUser, onClose, onJumpTo }: Props) {
  const [tab, setTab] = useState<Tab>('media');
  const [media, setMedia] = useState<ChatMessage[]>([]);
  const [starred, setStarred] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      apiFetch<ChatMessage[]>(`/conversations/${conversationId}/media`),
      apiFetch<ChatMessage[]>('/messages/starred'),
    ]).then(([mediaData, starredData]) => {
      setMedia(mediaData);
      setStarred(starredData.filter((m) => m.conversationId === conversationId));
      setLoading(false);
    });
  }, [conversationId]);

  useEffect(() => {
    if (!search.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      const data = await apiFetch<ChatMessage[]>(
        `/conversations/${conversationId}/search?q=${encodeURIComponent(search)}`,
      );
      setSearchResults(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, conversationId]);

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 lg:hidden"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 z-40 h-full w-full max-w-sm animate-slide-in-right border-l border-[rgb(var(--border))] bg-[rgb(var(--bg))] lg:static lg:z-auto lg:w-80 lg:max-w-none lg:animate-none">
        <div className="flex items-center justify-between border-b border-[rgb(var(--border))] p-3">
          <h2 className="text-sm font-semibold">Contact info</h2>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-[rgb(var(--bg-soft))]">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto thin-scrollbar" style={{ height: 'calc(100% - 49px)' }}>
          <div className="flex flex-col items-center gap-2 border-b border-[rgb(var(--border))] p-6">
            <UserAvatar name={otherUser.displayName} avatarUrl={otherUser.avatarUrl} size={88} />
            <h3 className="text-base font-semibold">{otherUser.displayName}</h3>
            <p className="text-xs text-[rgb(var(--text-soft))]">@{otherUser.username}</p>
            <p className="text-xs text-[rgb(var(--text-soft))]">
              {otherUser.isOnline ? '🟢 Online' : 'Offline'}
            </p>
            {otherUser.bio && (
              <p className="mt-2 text-center text-sm text-[rgb(var(--text-soft))]">{otherUser.bio}</p>
            )}
          </div>

          {/* Search in conversation */}
          <div className="border-b border-[rgb(var(--border))] p-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--text-soft))]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search in conversation..."
                className="w-full rounded-lg bg-[rgb(var(--bg-soft))] py-2 pl-8 pr-3 text-sm outline-none"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {searchResults.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onJumpTo(m.id)}
                    className="block w-full truncate rounded-lg p-2 text-left text-xs hover:bg-[rgb(var(--bg-soft))]"
                  >
                    {m.content}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b border-[rgb(var(--border))]">
            <button
              onClick={() => setTab('media')}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${
                tab === 'media' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-[rgb(var(--text-soft))]'
              }`}
            >
              <ImageIcon size={14} /> Media
            </button>
            <button
              onClick={() => setTab('starred')}
              className={`flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium ${
                tab === 'starred' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-[rgb(var(--text-soft))]'
              }`}
            >
              <Star size={14} /> Starred
            </button>
          </div>

          <div className="p-3">
            {loading && (
              <div className="grid grid-cols-3 gap-1.5">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="skeleton aspect-square animate-shimmer rounded-lg" />
                ))}
              </div>
            )}

            {!loading && tab === 'media' && (
              media.length === 0 ? (
                <p className="py-8 text-center text-sm text-[rgb(var(--text-soft))]">No shared media yet</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {media.map((m) =>
                    m.attachments.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => onJumpTo(m.id)}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-[rgb(var(--bg-soft))]"
                      >
                        {m.messageType === 'IMAGE' ? (
                          <img
                            src={`${FILE_ORIGIN}${a.url}`}
                            alt=""
                            className="h-full w-full object-cover transition group-hover:scale-105"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightbox(`${FILE_ORIGIN}${a.url}`);
                            }}
                          />
                        ) : (
                          <video src={`${FILE_ORIGIN}${a.url}`} className="h-full w-full object-cover" />
                        )}
                      </button>
                    )),
                  )}
                </div>
              )
            )}

            {!loading && tab === 'starred' && (
              starred.length === 0 ? (
                <p className="py-8 text-center text-sm text-[rgb(var(--text-soft))]">No starred messages</p>
              ) : (
                <div className="space-y-2">
                  {starred.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onJumpTo(m.id)}
                      className="block w-full rounded-lg bg-[rgb(var(--bg-soft))] p-2.5 text-left text-xs"
                    >
                      <p className="mb-0.5 font-medium">{m.sender.displayName}</p>
                      <p className="truncate text-[rgb(var(--text-soft))]">{m.content ?? 'Attachment'}</p>
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {lightbox && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4 animate-fade-in"
          onClick={() => setLightbox(null)}
        >
          <button className="absolute right-4 top-4 rounded-full p-2 text-white hover:bg-white/10">
            <X size={22} />
          </button>
          <a
            href={lightbox}
            download
            onClick={(e) => e.stopPropagation()}
            className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white"
          >
            <Download size={14} /> Download
          </a>
          <img src={lightbox} alt="" className="max-h-full max-w-full object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </>
  );
}
