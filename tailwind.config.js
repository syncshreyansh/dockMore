
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#E9E9E9',
        sidebar: '#E9E9E9',
        surface: '#E9E9E9',
        ink: '#303030',
        muted: '#8C8C8C',
        track: '#D1D1D1',
        progress: '#303030',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'serif'],
      },
      borderRadius: {
        'figma': '14px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        menu: '0 4px 16px rgba(48, 48, 48, 0.10)',
        panel: '0 1px 3px rgba(48, 48, 48, 0.05)',
      },
      animation: {
        'fade-in': 'fadeIn 0.8s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
