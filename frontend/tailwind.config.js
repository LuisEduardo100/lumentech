/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        lumentech: {
          gold: "#f75900", // This is the orange user requested
          dark: "#000000",
        },
        orglight: "#f75900",
        perfil: "#000000",
      },
      fontFamily: {
        sans: ['"TT Hoves"', 'Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
