import { MessageCircle } from 'lucide-react';

export default function ChatIndexPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-[rgb(var(--text-soft))]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--bg-soft))]">
        <MessageCircle size={28} />
      </div>
      <p className="text-sm">Select a conversation to start chatting</p>
    </div>
  );
}
