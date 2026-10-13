'use client';

import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/theme-context';

const ORDER = ['light', 'dark', 'system'] as const;
const ICONS = { light: Sun, dark: Moon, system: Monitor };

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const Icon = ICONS[theme];

  function cycle() {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
  }

  return (
    <button
      onClick={cycle}
      title={`Theme: ${theme}`}
      className="flex h-9 w-9 items-center justify-center rounded-full text-[rgb(var(--text-soft))] transition hover:bg-[rgb(var(--bg-soft))]"
    >
      <Icon size={18} />
    </button>
  );
}
