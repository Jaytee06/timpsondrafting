/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F1EA',
        ink: '#1F2328',
        blueprint: '#1E3A5F',
        orange: '#C8581E',
        steel: '#6B7280',
      },
      fontFamily: {
        display: ['Oswald', 'Barlow Condensed', 'Arial Narrow', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '4px' },
    },
  },
  plugins: [],
};
