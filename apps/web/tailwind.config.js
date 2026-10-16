/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        figma: {
          green: '#00A36C',
          'green-hover': '#008f5d',
          'green-light': '#E8F5E9',
          'green-border': '#A7F3D0',
          canvas: '#FFFFFF',
          sidebar: '#FFFFFF',
          card: '#FFFFFF',
          input: '#F3F4F6',
          border: '#E5E7EB',
          'border-dark': '#D1D5DB',
          text: '#111827',
          'text-secondary': '#4B5563',
          'text-muted': '#6B7280',
          'text-subtle': '#9CA3AF',
          amber: '#F59E0B',
          'amber-light': '#FEF3C7',
          'amber-text': '#B45309'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'figma-card': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.02)',
        'figma-modal': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        'figma-dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03)'
      }
    },
  },
  plugins: [],
}
