'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Check, CheckCheck, MoreHorizontal, Reply, Pencil, Trash2, Copy } from 'lucide-react';
import { ChatMessage } from '@/types';
import { API_URL } from '@/lib/api';

const QUICK_REACTIONS = ['❤️', '😂', '👍', '😢', '😮', '🔥'];
const FILE_ORIGIN = API_URL.replace(/\/api$/, '');

interface Props {
  message: ChatMessage;
  isMine: boolean;
  onReply: (m: ChatMessage) => void;
  onEdit: (m: ChatMessage) => void;
  onDelete: (id: string) => void;
  onReact: (id: string, emoji: string) => void;
  onJumpTo: (id: string) => void;
}

export function MessageBubble({ message, isMine, onReply, onEdit, onDelete, onReact, onJumpTo }: Props) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const groupedReactions = message.reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  function renderContent() {
    if (message.isDeleted) {
      return <p className="text-sm italic text-[rgb(var(--text-soft))]">This message was deleted</p>;
    }

    const attachment = message.attachments[0];

    if (message.messageType === 'IMAGE' && attachment) {
      return (
        <img
          src={`${FILE_ORIGIN}${attachment.url}`}
          alt={attachment.fileName}
          className="max-h-72 w-full rounded-lg object-cover"
        />
      );
    }
    if (message.messageType === 'VIDEO' && attachment) {
      return (
        <video controls className="max-h-72 w-full rounded-lg">
          <source src={`${FILE_ORIGIN}${attachment.url}`} type={attachment.mimeType} />
        </video>
      );
    }
    if (message.messageType === 'AUDIO' && attachment) {
      return (
        <audio controls className="w-56">
          <source src={`${FILE_ORIGIN}${attachment.url}`} type={attachment.mimeType} />
        </audio>
      );
    }
    if (message.messageType === 'FILE' && attachment) {
      return (
        <a
          href={`${FILE_ORIGIN}${attachment.url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-lg bg-black/10 px-3 py-2 text-sm underline"
        >
          📎 {attachment.fileName}
        </a>
      );
    }

    return <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>;
  }

  return (
    <div
      className={`group flex ${isMine ? 'justify-end' : 'justify-start'} px-3 py-0.5`}
      onMouseLeave={() => {
        setShowMenu(false);
        setShowReactions(false);
      }}
    >
      <div className={`flex max-w-[75%] items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
        <div className="relative">
          {message.replyTo && (
            <button
              onClick={() => onJumpTo(message.replyTo!.id)}
              className={`mb-1 block w-full rounded-lg border-l-2 border-brand-500 bg-black/5 px-2 py-1 text-left text-xs dark:bg-white/5 ${
                isMine ? 'text-white/80' : 'text-[rgb(var(--text-soft))]'
              }`}
            >
              <span className="font-medium">{message.replyTo.sender.displayName}</span>
              <p className="truncate">{message.replyTo.content ?? 'Attachment'}</p>
            </button>
          )}

          <div
            id={`msg-${message.id}`}
            className={`rounded-2xl px-3 py-2 ${
              isMine
                ? 'rounded-br-sm bg-[rgb(var(--bubble-mine))] text-white'
                : 'rounded-bl-sm bg-[rgb(var(--bubble-theirs))]'
            }`}
          >
            {renderContent()}
          </div>

          <div className={`mt-0.5 flex items-center gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] text-[rgb(var(--text-soft))]">
              {format(new Date(message.createdAt), 'HH:mm')}
            </span>
            {message.editedAt && !message.isDeleted && (
              <span className="text-[10px] italic text-[rgb(var(--text-soft))]">Edited</span>
            )}
            {isMine && !message.isDeleted && (
              <span className="text-[rgb(var(--text-soft))]">
                {message.status === 'read' ? (
                  <CheckCheck size={13} className="text-brand-500" />
                ) : message.status === 'sending' ? (
                  <Check size={13} className="opacity-40" />
                ) : (
                  <CheckCheck size={13} />
                )}
              </span>
            )}
          </div>

          {Object.keys(groupedReactions).length > 0 && (
            <div className={`mt-1 flex flex-wrap gap-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
              {Object.entries(groupedReactions).map(([emoji, count]) => (
                <button
                  key={emoji}
                  onClick={() => onReact(message.id, emoji)}
                  className="flex items-center gap-0.5 rounded-full bg-[rgb(var(--bg-soft))] px-1.5 py-0.5 text-xs"
                >
                  {emoji} {count > 1 && <span className="text-[10px]">{count}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Hover action bar */}
        {!message.isDeleted && (
          <div className="relative flex shrink-0 items-center opacity-0 transition group-hover:opacity-100">
            <button
              onClick={() => setShowReactions((s) => !s)}
              className="rounded-full p-1.5 text-[rgb(var(--text-soft))] hover:bg-[rgb(var(--bg-soft))]"
              title="React"
            >
              🙂
            </button>
            <button
              onClick={() => onReply(message)}
              className="rounded-full p-1.5 text-[rgb(var(--text-soft))] hover:bg-[rgb(var(--bg-soft))]"
              title="Reply"
            >
              <Reply size={15} />
            </button>
            <button
              onClick={() => setShowMenu((s) => !s)}
              className="rounded-full p-1.5 text-[rgb(var(--text-soft))] hover:bg-[rgb(var(--bg-soft))]"
              title="More"
            >
              <MoreHorizontal size={15} />
            </button>

            {showReactions && (
              <div className="absolute bottom-full z-10 mb-1 flex gap-1 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--bg))] px-2 py-1 shadow-lg animate-pop-in">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      onReact(message.id, emoji);
                      setShowReactions(false);
                    }}
                    className="text-lg transition hover:scale-125"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {showMenu && (
              <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--bg))] py-1 text-sm shadow-lg animate-pop-in">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(message.content ?? '');
                    setShowMenu(false);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-[rgb(var(--bg-soft))]"
                >
                  <Copy size={14} /> Copy
                </button>
                {isMine && message.messageType === 'TEXT' && (
                  <button
                    onClick={() => {
                      onEdit(message);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 hover:bg-[rgb(var(--bg-soft))]"
                  >
                    <Pencil size={14} /> Edit
                  </button>
                )}
                {isMine && (
                  <button
                    onClick={() => {
                      onDelete(message.id);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-red-500 hover:bg-red-500/10"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
