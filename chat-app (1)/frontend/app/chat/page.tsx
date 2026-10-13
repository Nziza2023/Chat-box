'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

// This app has exactly one conversation — the private thread between the
// two authorized users. Instead of showing a "pick a conversation" screen,
// we fetch that one conversation and jump straight into it.
export default function ChatIndexPage() {
  const router = useRouter();

  useEffect(() => {
    apiFetch<{ id: string }>('/conversations/private').then((conversation) => {
      router.replace(`/chat/${conversation.id}`);
    });
  }, [router]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
    </div>
  );
}
