/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        complete: {
          DEFAULT: "#80ac5f",
          soft: "#eaf2e3",
          ring: "#c7ddb4",
          hover: "#6f9951",
        },
        in_progress: {
          DEFAULT: "#475dd7",
          soft: "#e7eaff",
          ring: "#c6cdfb",
          hover: "#3b4fc3",
        },
        not_started: {
          DEFAULT: "#d25c7f",
          soft: "#fde7ee",
          ring: "#f5bfd0",
          hover: "#be4d70",
        },
      },
    },
  },
  plugins: [],
};
