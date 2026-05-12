import type { Config } from 'tailwindcss';

/**
 * Kids ABA design tokens.
 *
 * Rules (read these before editing):
 *   - White is the only surface color. Depth = hairline borders + soft shadows.
 *   - Purple is for one thing at a time (active nav, primary CTA, focused field, link).
 *   - Text is black by default. Greying is reserved for genuinely secondary metadata.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#FFFFFF',
          sunken: '#FAFAFB',
        },
        ink: {
          DEFAULT: '#0A0A0F',
          muted: '#5B5668',
          subtle: '#8A8595',
        },
        line: {
          DEFAULT: '#ECEAF1',
          strong: '#D9D5E0',
        },
        purple: {
          50: '#F5F1FE',
          100: '#E8DFFC',
          200: '#CFBDF8',
          500: '#7C4DFF',
          600: '#6534E5',
          700: '#5128C2',
          800: '#3F1F9C',
        },
        success: {
          50: '#E8F6EE',
          600: '#0F8A4C',
        },
        danger: {
          50: '#FCEAEA',
          600: '#C42A2A',
        },
        warning: {
          50: '#FBF1DF',
          600: '#A6620A',
        },
      },
      fontFamily: {
        sans: [
          '"Inter Variable"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        display: [
          '"Inter Variable"',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['28px', { lineHeight: '36px', letterSpacing: '-0.02em', fontWeight: '600' }],
        h2: ['20px', { lineHeight: '28px', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px' }],
        'body-strong': ['15px', { lineHeight: '22px', fontWeight: '500' }],
        small: ['13px', { lineHeight: '20px' }],
        micro: ['12px', { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,10,15,0.04)',
        raised:
          '0 8px 24px -8px rgba(10,10,15,0.12), 0 2px 6px rgba(10,10,15,0.06)',
        toast: '0 12px 32px -8px rgba(10,10,15,0.18)',
        focus: '0 0 0 2px #FFFFFF, 0 0 0 4px #CFBDF8',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.16, 1, 0.3, 1)',
        in: 'cubic-bezier(0.7, 0, 0.84, 0)',
        soft: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'pop-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-from-left': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
        breathe: {
          '0%,100%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.08)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'pop-in': 'pop-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'toast-in': 'toast-in 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-from-left': 'slide-from-left 200ms cubic-bezier(0.16, 1, 0.3, 1)',
        breathe: 'breathe 6000ms cubic-bezier(0.4, 0, 0.2, 1) infinite',
        shimmer: 'shimmer 1400ms linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
