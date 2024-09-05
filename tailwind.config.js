/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./components/**/*.{html,js,templ}",
    ],
    theme: {
        extend: {},
    },
    plugins: [
        require("@tailwindcss/forms"),
    ],
}

