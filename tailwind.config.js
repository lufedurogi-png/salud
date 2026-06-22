module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}'],
    darkMode: 'class',
    theme: {
        extend: {
            /* Panel cliente: sidebar antes que el breakpoint xl por defecto (1280px) */
            screens: {
                desktop: '900px',
            },
            keyframes: {
                'loading-bar': {
                    '0%': { transform: 'translateX(-100%)' },
                    '100%': { transform: 'translateX(350%)' },
                },
            },
            animation: {
                'loading-bar': 'loading-bar 0.8s ease-in-out infinite',
            },
        },
    },
    plugins: [require('@tailwindcss/forms')],
}
