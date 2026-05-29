/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./contents/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490"
        }
      },
      boxShadow: {
        echosift:
          "0 18px 60px rgba(15, 23, 42, 0.22), 0 6px 20px rgba(8, 145, 178, 0.18)"
      }
    }
  },
  plugins: []
}
