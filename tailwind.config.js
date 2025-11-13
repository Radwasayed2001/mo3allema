// tailwind.config.cjs
module.exports = {
	content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
	theme: {
		extend: {
			colors: {
				brand: {
					50: '#f0fbf6',
					100: '#dff7ec',
					200: '#bff0d9',
					300: '#99e6c0',
					400: '#66d3a0',
					500: '#35b97a',
					600: '#2f9e66',
					700: '#257b4f',
					800: '#1b5b3a',
					900: '#123826'
				},
				muted: {
					50: '#fbfcfd',
					100: '#f3f6f7',
					200: '#e9eef0',
				}
			},
			fontFamily: {
				sans: ['Cairo', 'Inter', 'system-ui', 'sans-serif'],
			},
			boxShadow: {
				card: '0 8px 20px rgba(16,24,40,0.06), 0 2px 6px rgba(16,24,40,0.04)'
			}
		},
	},
	plugins: [],
};
