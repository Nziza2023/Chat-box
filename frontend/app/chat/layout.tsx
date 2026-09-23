'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Sidebar } from '@/components/chat/Sidebar';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Protects every page under /chat — if there's no logged-in user once
  // loading finishes, bounce to the login page. This is what stops someone
  // from typing /chat straight into the address bar without being authenticated.
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  // A specific conversation is open when the URL is /chat/<something>.
  // On mobile we show ONLY the sidebar OR ONLY the open chat, never both —
  // this is the "proper mobile experience" instead of just shrinking desktop.
  const hasOpenConversation = pathname !== '/chat';

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      <div className={`h-full w-full shrink-0 md:w-[360px] ${hasOpenConversation ? 'hidden md:block' : 'block'}`}>
        <Sidebar />
      </div>
      <div className={`h-full flex-1 ${hasOpenConversation ? 'block' : 'hidden md:block'}`}>{children}</div>
    </div>
  );
}
