/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        'muted-bg': 'var(--muted-bg)',
        'input-bg': 'var(--input-bg)',
        accent: 'var(--accent)',
        'accent-foreground': 'var(--accent-foreground)',
      },
      boxShadow: {
        'prestix': '0 4px 14px rgba(196, 30, 58, 0.12), 0 2px 6px rgba(0,0,0,0.06)',
        'prestix-hover': '0 8px 24px rgba(196, 30, 58, 0.18), 0 4px 10px rgba(0,0,0,0.08)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        serif: ['var(--font-serif)', 'serif'],
      },
    },
  },
  plugins: [],
}
