/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F1EA',
        ink: '#1F2328',
        blueprint: '#293F50',
        orange: '#A6532B',
        steel: '#6B7280',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { DEFAULT: '4px' },
    },
  },
  plugins: [],
};
