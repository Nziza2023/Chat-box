/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Chatly's own identity: deep violet as the primary accent (not
        // WhatsApp green, not Telegram/Messenger blue), with a warm coral
        // used sparingly for live/urgent signals (unread badges, recording).
        brand: {
          50: '#f3f0ff',
          100: '#e6e0ff',
          200: '#c9baff',
          300: '#a98cff',
          400: '#8c63ff',
          500: '#7645ff',
          600: '#6230e8',
          700: '#4f23bf',
          800: '#3c1a94',
          900: '#2a1269',
        },
        coral: {
          400: '#ff8a65',
          500: '#ff6b4a',
          600: '#eb4f2e',
        },
      },
      keyframes: {
        'fade-in': { '0%': { opacity: 0, transform: 'translateY(4px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'pop-in': { '0%': { opacity: 0, transform: 'scale(0.92)' }, '100%': { opacity: 1, transform: 'scale(1)' } },
        'slide-up': { '0%': { opacity: 0, transform: 'translateY(10px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'slide-in-right': { '0%': { opacity: 0, transform: 'translateX(16px)' }, '100%': { opacity: 1, transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'ring-spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.18s ease-out',
        'pop-in': 'pop-in 0.16s cubic-bezier(0.34,1.56,0.64,1)',
        'slide-up': 'slide-up 0.22s ease-out',
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.16,1,0.3,1)',
        shimmer: 'shimmer 1.8s infinite linear',
      },
      boxShadow: {
        soft: '0 2px 12px -2px rgb(0 0 0 / 0.08)',
        elevated: '0 12px 32px -8px rgb(0 0 0 / 0.18)',
      },
    },
  },
  plugins: [],
};
