/** @type {import("tailwindcss").Config} */
module.exports = {
  content: ["./contents/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f8fafc",
        muted: "#94a3b8",
        line: "rgba(148, 163, 184, 0.22)",
        brand: {
          50: "rgba(8, 145, 178, 0.12)",
          100: "rgba(6, 182, 212, 0.18)",
          500: "#06b6d4",
          600: "#22d3ee",
          700: "#67e8f9"
        }
      },
      boxShadow: {
        soft: "0 24px 80px rgba(0, 0, 0, 0.34)",
        echosift:
          "0 22px 70px rgba(2, 6, 23, 0.44), 0 8px 28px rgba(6, 182, 212, 0.24)"
      }
    }
  },
  plugins: []
}
