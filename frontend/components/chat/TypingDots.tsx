export function TypingDots() {
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-[rgb(var(--bubble-theirs))] px-3 py-2.5">
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[rgb(var(--text-soft))]" style={{ animationDelay: '0ms' }} />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[rgb(var(--text-soft))]" style={{ animationDelay: '150ms' }} />
      <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[rgb(var(--text-soft))]" style={{ animationDelay: '300ms' }} />
    </div>
  );
}
