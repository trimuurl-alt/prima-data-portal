/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F4EF',
          100: '#C7E4D6',
          400: '#3F9170',
          600: '#1A6B4A',
          700: '#155738',
          800: '#0F4429',
          900: '#08311B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
