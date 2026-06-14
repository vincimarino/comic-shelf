import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: {
          dark:   '#0e0804',
          base:   '#1a0e06',
          mid:    '#2c1a0e',
          plank:  '#6B4423',
          light:  '#8B5E3C',
          edge:   '#a0723a',
          text:   '#d4a96a',
          muted:  '#6b4c2a',
          sep:    '#3d2510',
        },
        amber: {
          acc: '#f59e0b',
          dim: '#78350f',
          bg:  'rgba(245,158,11,0.12)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        sans:    ['var(--font-sans)',    'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
