import forms from '@tailwindcss/forms';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e9f5f0',
          100: '#cde9dd',
          200: '#aad8be',
          300: '#7fbd99',
          400: '#4d9f74',
          500: '#1d9e75',
          600: '#177c60',
          700: '#125f4d',
          800: '#0f4939',
          900: '#0a3226'
        },
        accent: '#ba7517',
        danger: '#e24b4a',
        navy: '#0a1929'
      },
      boxShadow: {
        soft: '0 24px 80px rgba(15, 23, 42, 0.16)'
      }
    }
  },
  plugins: [forms]
};
