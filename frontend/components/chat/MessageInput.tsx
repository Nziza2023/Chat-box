'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Paperclip, X, Smile, Loader2 } from 'lucide-react';
import { getAccessToken, API_URL } from '@/lib/api';
import { ChatMessage } from '@/types';

const QUICK_EMOJIS = ['😀', '😂', '❤️', '👍', '🔥', '🎉', '😢', '😮', '🙏', '👏'];

interface Props {
  replyTo: ChatMessage | null;
  editingMessage: ChatMessage | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSend: (payload: { content?: string; messageType?: string; replyToId?: string; attachment?: any }) => void;
  onSubmitEdit: (id: string, content: string) => void;
  onTyping: (isTyping: boolean) => void;
}

export function MessageInput({
  replyTo,
  editingMessage,
  onCancelReply,
  onCancelEdit,
  onSend,
  onSubmitEdit,
  onTyping,
}: Props) {
  const [text, setText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (editingMessage) setText(editingMessage.content ?? '');
  }, [editingMessage]);

  function handleChange(value: string) {
    setText(value);
    onTyping(true);
    if (typingTimeout.current) clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => onTyping(false), 1500);
  }

  function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (editingMessage) {
      onSubmitEdit(editingMessage.id, trimmed);
    } else {
      onSend({ content: trimmed, messageType: 'TEXT', replyToId: replyTo?.id });
    }
    setText('');
    onTyping(false);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${API_URL}/files/upload`, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${getAccessToken()}` },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();

      onSend({
        messageType: data.suggestedMessageType,
        replyToId: replyTo?.id,
        attachment: {
          url: data.url,
          fileName: data.fileName,
          mimeType: data.mimeType,
          sizeBytes: data.sizeBytes,
        },
      });
    } catch {
      alert('Unable to upload file. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  const context = editingMessage
    ? { label: 'Editing message', text: editingMessage.content ?? '', onCancel: onCancelEdit }
    : replyTo
      ? { label: `Replying to ${replyTo.sender.displayName}`, text: replyTo.content ?? 'Attachment', onCancel: onCancelReply }
      : null;

  return (
    <div className="border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-3">
      {context && (
        <div className="mb-2 flex items-center justify-between rounded-lg bg-[rgb(var(--bg-soft))] px-3 py-1.5 text-xs">
          <div className="min-w-0">
            <p className="font-medium text-brand-500">{context.label}</p>
            <p className="truncate text-[rgb(var(--text-soft))]">{context.text}</p>
          </div>
          <button onClick={context.onCancel} className="shrink-0 rounded-full p-1 hover:bg-black/10">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" hidden onChange={handleFileSelect} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[rgb(var(--text-soft))] transition hover:bg-[rgb(var(--bg-soft))]"
          title="Attach a file"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
        </button>

        <div className="relative flex-1">
          <textarea
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="max-h-32 w-full resize-none rounded-2xl bg-[rgb(var(--bg-soft))] py-2.5 pl-4 pr-10 text-sm outline-none"
          />
          <button
            onClick={() => setShowEmoji((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgb(var(--text-soft))]"
          >
            <Smile size={18} />
          </button>

          {showEmoji && (
            <div className="absolute bottom-full right-0 mb-2 flex w-56 flex-wrap gap-1 rounded-xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-2 shadow-lg animate-pop-in">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => {
                    setText((t) => t + e);
                    setShowEmoji(false);
                  }}
                  className="rounded p-1 text-lg hover:bg-[rgb(var(--bg-soft))]"
                >
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white transition hover:bg-brand-600 disabled:opacity-40"
        >
          <Send size={17} />
        </button>
      </div>
    </div>
  );
}
