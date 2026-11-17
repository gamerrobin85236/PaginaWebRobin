/** @type {import('tailwindcss').Config} */
// Los colores salen de las variables de src/styles/theme.css.
// Para cambiar los colores de toda la tienda, edita ese archivo.
const c = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: c('color-bg'),
        surface: c('color-surface'),
        surface2: c('color-surface-2'),
        line: c('color-line'),
        primary: c('color-primary'),
        'primary-ink': c('color-primary-ink'),
        accent: c('color-accent'),
        ink: c('color-text'),
        muted: c('color-muted'),
        danger: c('color-danger'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Rajdhani', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
