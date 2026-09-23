'use client';

import Image from 'next/image';

interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  online?: boolean;
  showStatus?: boolean;
}

export function UserAvatar({ name, avatarUrl, size = 40, online, showStatus }: Props) {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          width={size}
          height={size}
          className="rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-brand-500 font-medium text-white"
          style={{ fontSize: size * 0.38 }}
        >
          {initials}
        </div>
      )}
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[rgb(var(--bg))] ${
            online ? 'bg-green-500' : 'bg-gray-400'
          }`}
          style={{ width: size * 0.3, height: size * 0.3 }}
        />
      )}
    </div>
  );
}
