/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        slate: {
          950: '#0b132b',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'xl': '18px',
        '2xl': '24px',
      },
      boxShadow: {
        'ambient': '0 4px 20px -2px rgba(15, 23, 42, 0.08)',
        'elevated': '0 16px 36px -4px rgba(15, 23, 42, 0.12)',
        'glow': '0 0 24px rgba(2, 132, 199, 0.35)',
      }
    },
  },
  plugins: [],
};
