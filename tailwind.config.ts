import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* ── Sparq Design System Tokens ────────────────── */
        sparq: {
          /* Brand */
          coral:        '#E96B56',   /* Primary CTA */
          'coral-dark': '#a63a29',   /* Hover */
          'coral-light':'#f9ede9',   /* Light tint */

          /* Neutrals */
          ink:          '#1A1A1A',   /* Primary text */
          body:         '#555555',   /* Body / secondary text */
          muted:        '#8A8A8A',   /* Tertiary / placeholders */
          cream:        '#FDFBF7',   /* Page bg */
          surface:      '#ffffff',   /* Card bg */
          'surface-warm':'#f9f2ef',  /* Warm container */
          'surface-mid': '#f3ece9',  /* Tinted container */
          'border':     '#e8e1de',   /* Standard border */

          /* Status */
          success:      '#1a9e6f',
          warning:      '#c08000',
          error:        '#c0392b',

          /* Legacy (keep to avoid breaking existing usage) */
          amber: '#E96B56',
          gold: '#F59C22',
          flash: '#FFD07A',
          pale: '#FFF3D0',
          charcoal: '#1C1608',
          ash: '#252010',
          forest: '#2D3B2D',
          sage: '#5C7C5C',
          olive: '#4A6741',
          linen: '#F5F0EA',
          sand: '#EDE8DF',
        },
        // M3 color tokens
        'm3-primary': '#a63a29',
        'm3-primary-container': '#e96b56',
        'm3-on-primary': '#ffffff',
        'm3-on-primary-container': '#5c0400',
        'm3-secondary': '#884f45',
        'm3-secondary-container': '#ffb4a7',
        'm3-on-secondary-container': '#7a433a',
        'm3-tertiary': '#006b5d',
        'm3-tertiary-container': '#00a490',
        'm3-surface': '#fff8f5',
        'm3-surface-container': '#f3ece9',
        'm3-surface-container-low': '#f9f2ef',
        'm3-surface-container-high': '#eee7e4',
        'm3-surface-container-highest': '#e8e1de',
        'm3-surface-container-lowest': '#ffffff',
        'm3-on-surface': '#1e1b1a',
        'm3-on-surface-variant': '#57423e',
        'm3-outline': '#8b716d',
        'm3-outline-variant': '#dec0ba',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      fontSize: {
        'micro': ['0.625rem', { lineHeight: '0.875rem' }],
        'label': ['0.6875rem', { lineHeight: '1rem' }],
        'body-compact': ['0.8125rem', { lineHeight: '1.25rem' }],
        'stat': ['2rem', { lineHeight: '1' }],
        'display-xl': ['clamp(3rem, 4vw + 1.5rem, 5rem)', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.5rem, 3vw + 1.2rem, 4rem)', { lineHeight: '1.08', letterSpacing: '-0.025em' }],
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-headline)', 'Noto Serif', 'Georgia', 'serif'],
        serif: ['var(--font-headline)', 'Noto Serif', 'Georgia', 'Times New Roman', 'serif'],
        headline: ['var(--font-headline)', 'Noto Serif', 'Georgia', 'serif'],
        jakarta: ['var(--font-jakarta)', 'Plus Jakarta Sans', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-in-up': 'fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(-4px)' },
          '50%': { transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #E96B56 0%, #a63a29 100%)',
        'gradient-dark': 'linear-gradient(135deg, #1A1A1A 0%, #E96B56 100%)',
        'gradient-warm': 'linear-gradient(180deg, #FDFBF7 0%, #F5F0EA 100%)',
        'gradient-hero': 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(212, 130, 10, 0.08), transparent)',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.04)',
        'card-hover': '0 12px 40px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.04)',
        'elevated': '0 20px 60px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05)',
        'primary': '0 4px 14px rgba(212, 130, 10, 0.3)',
        'search': '0 4px 20px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
        'search-focus': '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.04)',
        'nav': '0 1px 0 rgba(0, 0, 0, 0.04)',
        'nav-scrolled': '0 4px 20px rgba(0, 0, 0, 0.06)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
}

export default config
