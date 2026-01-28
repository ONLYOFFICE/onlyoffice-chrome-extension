import { resolve } from 'path';
import { defineConfig } from 'vite';

import preact from '@preact/preset-vite';

export default defineConfig({
	plugins: [preact()],
	resolve: {
		alias: {
			'@components': resolve(__dirname, 'src/components'),
			'@config': resolve(__dirname, 'src/config'),
			'@features': resolve(__dirname, 'src/features'),
			'@hooks': resolve(__dirname, 'src/hooks'),
			'@icons': resolve(__dirname, 'public/icons'),
			'@pages': resolve(__dirname, 'src/pages'),
			'@stores': resolve(__dirname, 'src/stores'),
			'@styles': resolve(__dirname, 'src/styles'),
			'@utils': resolve(__dirname, 'src/utils'),
			'@vendor': resolve(__dirname, 'vendor'),
		},
	},
	build: {
		rollupOptions: {
			input: {
				popup: resolve(__dirname, 'index.html'),
				background: resolve(__dirname, 'src/background.ts'),
			},
			output: {
				entryFileNames: (chunkInfo) => {
					return chunkInfo.name === 'background' 
						? '[name].js' 
						: 'assets/[name]-[hash].js';
				},
			},
		},
		outDir: 'dist',
		emptyOutDir: true,
	},
	publicDir: 'public',
});
