/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ivory: '#F6F5EF',
        forest: {
          950: '#0B1C17',
          900: '#112C24',
          800: '#183D32', // Deep forest green (primary brand)
          700: '#235244',
          600: '#316B5A',
          50: '#EDF4F1',
        },
        sage: {
          50: '#F7FBF5',
          100: '#EEF5E9',
          200: '#DCE7D5', // Muted sage
          300: '#C3D6B9',
          400: '#9FB992',
          600: '#5F7C53',
        },
        citrus: '#D7E68A', // Restrained citrus accent
        terracotta: {
          DEFAULT: '#C87553', // Terracotta for selected warnings/attention
          light: '#F8EBE6',
          dark: '#A65A3A',
        },
        charcoal: '#202923', // Deep charcoal text
        muted: '#747B73', // Muted secondary text
        borderLine: '#E4E5DC', // Fine borders
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
      },
      boxShadow: {
        'subtle': '0 1px 3px rgba(32, 41, 35, 0.04), 0 1px 2px rgba(32, 41, 35, 0.02)',
        'elevated': '0 4px 12px rgba(32, 41, 35, 0.06)',
      }
    },
  },
  plugins: [],
}
