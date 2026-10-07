/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // colours are CSS variables so the soft navy night theme can swap them
        cream: "rgb(var(--c-cream) / <alpha-value>)",
        creamdeep: "rgb(var(--c-creamdeep) / <alpha-value>)",
        baby: "rgb(var(--c-baby) / <alpha-value>)",
        babydeep: "rgb(var(--c-babydeep) / <alpha-value>)",
        cherry: "rgb(var(--c-cherry) / <alpha-value>)",
        navy: "rgb(var(--c-navy) / <alpha-value>)",
        leaf: "#5EE07A",
        sun: "#FFE95C",
      },
      fontFamily: {
        hand: ['"Patrick Hand"', '"Gaegu"', "cursive"],
        body: ['"Nunito"', "system-ui", "sans-serif"],
        game: ['"Gaegu"', '"Patrick Hand"', "cursive"],
      },
      boxShadow: {
        sticker: "0 3px 0 0 rgba(43,58,85,.18), 0 8px 18px -8px rgba(43,58,85,.25)",
      },
      borderRadius: { phone: "2.75rem" },
    },
  },
  plugins: [],
};
