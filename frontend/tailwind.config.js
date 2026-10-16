/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#030712',
          900: '#060B14',
          800: '#0B132B',
          700: '#111D3E',
          600: '#1C2E5A',
        },
        neon: {
          cyan: '#00F2FE',
          teal: '#0D9488',
          blue: '#38BDF8',
          amber: '#F59E0B',
          rose: '#F43F5E',
          emerald: '#10B981',
          violet: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
      }
    },
  },
  plugins: [],
}
