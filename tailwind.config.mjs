/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/index.html', './src/renderer/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Museum identity: sandstone, papyrus, lapis and gold.
        sand: {
          50: '#faf7f2',
          100: '#f3ece0',
          200: '#e6d9c3',
          300: '#d4bf9c',
          400: '#c0a173',
          500: '#ad8955',
          600: '#95714a',
          700: '#78593e',
          800: '#634937',
          900: '#533e31',
        },
        lapis: {
          50: '#eef3fb',
          100: '#d8e4f6',
          200: '#b9cfee',
          300: '#8bb1e2',
          400: '#568bd2',
          500: '#356dbe',
          600: '#2556a0',
          700: '#1f4582',
          800: '#1e3c6c',
          900: '#1d345b',
        },
        gold: {
          400: '#d4a843',
          500: '#c39030',
          600: '#a87326',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        arabic: ['Cairo', 'Tajawal', 'Segoe UI', 'Tahoma', 'sans-serif'],
        serif: ['Georgia', 'Cambria', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16, 24, 40, 0.06), 0 4px 12px rgba(16, 24, 40, 0.08)',
        'card-hover': '0 4px 8px rgba(16, 24, 40, 0.08), 0 12px 28px rgba(16, 24, 40, 0.14)',
      },
    },
  },
  plugins: [],
};
