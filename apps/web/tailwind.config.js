/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF3DC",
        creamdeep: "#F3E6C2",
        baby: "#A9C8E3",
        babydeep: "#8FB4D6",
        cherry: "#C8323A",
        navy: "#2B3A55",
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
