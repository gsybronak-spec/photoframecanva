/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#17362f',
        forest: '#1f4a3f',
        sage: '#79987e',
        cream: '#faf6ed',
        sand: '#e7d6bb',
        saffron: '#db9b35',
        clay: '#be6c45',
        line: '#e8dfcf',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        serif: ['"Playfair Display"', 'serif'],
        mono: ['"Space Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
