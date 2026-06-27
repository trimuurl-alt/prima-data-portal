/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Primaresearch brand red — derived from #A41D2C on their site
        brand: {
          50: '#FBEEF0',
          100: '#F4D2D7',
          200: '#E9A8B1',
          300: '#D87783',
          400: '#C24757',
          500: '#A41D2C',
          600: '#8E1727',
          700: '#761121',
          800: '#5C0D1A',
          900: '#3F0911',
        },
        // Charcoal — for dark backgrounds (footer panel, login left side)
        ink: {
          DEFAULT: '#282828',
          dark: '#1A1A1A',
          mid: '#3A3A3A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
