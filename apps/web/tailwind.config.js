/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-manrope)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      boxShadow: {
        soft: '0 6px 24px rgba(0,0,0,0.06)',
        float: '0 10px 30px rgba(0,0,0,0.08)',
      },
      colors: {
        mc: {
          bg: 'hsl(var(--mc-bg))',
          card: 'hsl(var(--mc-card))',
          border: 'hsl(var(--mc-border))',
          text: 'hsl(var(--mc-text))',
          subtle: 'hsl(var(--mc-subtle))',
          primary: 'hsl(var(--mc-primary))',
          primaryFg: 'hsl(var(--mc-primary-fg))',
        },
        freq: {
          A: 'hsl(var(--freq-a))',
          B: 'hsl(var(--freq-b))',
          C: 'hsl(var(--freq-c))',
          D: 'hsl(var(--freq-d))',
        },
      },
      backgroundImage: {
        'mc-gradient': 'linear-gradient(135deg, hsl(var(--freq-a)) 0%, hsl(var(--freq-c)) 100%)',
        'mc-hero':
          'radial-gradient(65% 65% at 70% 30%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 60%), linear-gradient(135deg, hsl(var(--freq-a)) 0%, hsl(var(--freq-d)) 100%)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
