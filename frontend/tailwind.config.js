module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        spin: "spin 4s linear infinite",
        "spin-reverse": "spin 15s linear infinite reverse",
      },
    },
  },
  plugins: [],
};

