/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ARIA DineAssist Brand Palette
        forest: {
          950: '#0A1E19',
          900: '#102C25', // Dark green-black
          850: '#13352C', // Deep forest shade
          800: '#163D32', // Deep forest green (primary brand)
          700: '#1E4E41',
          600: '#2A6857',
          500: '#3D8370',
          200: '#C2D6CC',
          100: '#E2EBE7',
          50: '#F0F5F2',
        },
        lime: {
          accent: '#D7F36B', // Fresh lime accent
          hover: '#C8E856',
          light: '#F2FCD1',
        },
        warmBg: '#F1F2E9', // Warm light background
        surface: {
          DEFAULT: '#FFFFFF',
          warm: '#F8F8F2', // Warm neutral surface
          subtle: '#EAEBE1',
        },
        terracotta: {
          DEFAULT: '#DE7658', // Urgent attention / alerts
          light: '#FBEEEA',
          dark: '#B85235',
        },
        amber: {
          DEFAULT: '#F2BB50', // Active preparation / waiting
          light: '#FDF6E7',
          dark: '#C89327',
        },
        completed: {
          DEFAULT: '#B9E4B5', // Completed actions / ready
          dark: '#2E7A27',
          light: '#EEFAED',
        },
        ink: {
          primary: '#1D2923', // Primary text
          secondary: '#69746B', // Secondary text
          muted: '#8A958C',
        },
        borderLine: '#E2E4D8', // Fine operational borders
      },
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        DEFAULT: '8px',
        'md': '10px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '20px',
      },
      boxShadow: {
        'ticket': '0 2px 8px rgba(16, 44, 37, 0.06), 0 1px 3px rgba(16, 44, 37, 0.04)',
        'ticket-hover': '0 6px 16px rgba(16, 44, 37, 0.09), 0 2px 6px rgba(16, 44, 37, 0.06)',
        'modal': '0 12px 36px rgba(16, 44, 37, 0.16)',
      }
    },
  },
  plugins: [],
}
