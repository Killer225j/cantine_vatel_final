/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        vatel: {
          primary: '#1B6FA8',
          'primary-light': '#3F93CC',
          'primary-dark': '#12507D',
          bg: '#F3F7FA',
          gray: '#9E9E9E',
          'gray-dark': '#424242',
          black: '#212121',
        },
        success: '#2E7D32',
        warning: '#F57F17',
        error: '#D32F2F',
        info: '#1565C0',
      },
    },
  },
  plugins: [],
}
