/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#061024",
          900: "#081733",
          800: "#0b214a"
        }
      }
    }
  },
  plugins: []
};

