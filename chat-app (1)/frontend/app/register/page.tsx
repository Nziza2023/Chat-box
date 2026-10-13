import Link from 'next/link';
import { Lock } from 'lucide-react';

// Public registration is permanently disabled — this is a private messenger
// for exactly two pre-authorized people (enforced on the backend via
// AUTHORIZED_USER_IDS). This page exists only so visiting /register explains
// why, instead of 404ing or silently redirecting.
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--bg-soft))] px-4">
      <div className="w-full max-w-sm rounded-2xl border border-[rgb(var(--border))] bg-[rgb(var(--bg))] p-8 text-center shadow-sm animate-fade-in">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--bg-soft))]">
          <Lock size={22} className="text-[rgb(var(--text-soft))]" />
        </div>
        <h1 className="mb-2 text-lg font-semibold">Registration is disabled</h1>
        <p className="mb-6 text-sm text-[rgb(var(--text-soft))]">
          Chatly is a private messenger for two authorized people only. New accounts can&apos;t be
          created here.
        </p>
        <Link
          href="/login"
          className="inline-block w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
        >
          Back to log in
        </Link>
      </div>
    </div>
  );
}
