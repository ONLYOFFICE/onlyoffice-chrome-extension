import preact from '@preact/preset-vite';
import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';
import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'fs';

const copyBrowserFiles = (isFirefoxBuild: boolean) => {
	return {
		name: 'copy-browser-files',
		writeBundle() {
			const distDir = isFirefoxBuild 
				? resolve(__dirname, 'dist-firefox')
				: resolve(__dirname, 'dist-chrome');
			
			const manifestPath = isFirefoxBuild
				? resolve(__dirname, 'public/firefox/manifest.json')
				: resolve(__dirname, 'public/chrome/manifest.json');
			const distManifest = resolve(distDir, 'manifest.json');
			
			if (existsSync(manifestPath)) {
				if (!existsSync(distDir)) {
					mkdirSync(distDir, { recursive: true });
				}
				copyFileSync(manifestPath, distManifest);
			}
			
			const publicDir = resolve(__dirname, 'public');
			const copyRecursive = (src: string, dest: string) => {
				if (!existsSync(dest)) {
					mkdirSync(dest, { recursive: true });
				}
				const entries = readdirSync(src, { withFileTypes: true });
				for (const entry of entries) {
					const srcPath = resolve(src, entry.name);
					const destPath = resolve(dest, entry.name);
					if (entry.isDirectory()) {
						if (entry.name !== 'chrome' && entry.name !== 'firefox') {
							copyRecursive(srcPath, destPath);
						}
					} else {
						copyFileSync(srcPath, destPath);
					}
				}
			};
			copyRecursive(publicDir, distDir);
		},
	};
};

export default defineConfig(({ mode }) => {
	const isFirefox = mode === 'firefox';
	
	const env = loadEnv(mode, process.cwd(), '');
	
	const errors: string[] = [];
	
	if (isFirefox) {
		if (!env.VITE_TOKEN_FIREFOX_EXCHANGE_URL) {
			errors.push('VITE_TOKEN_FIREFOX_EXCHANGE_URL is not set in .env');
		}
		if (!env.VITE_OAUTH_FIREFOX_CLIENT_ID) {
			errors.push('VITE_OAUTH_FIREFOX_CLIENT_ID is not set in .env');
		}
	} else {
		if (!env.VITE_TOKEN_CHROME_EXCHANGE_URL) {
			errors.push('VITE_TOKEN_CHROME_EXCHANGE_URL is not set in .env');
		}
		if (!env.VITE_OAUTH_CHROME_CLIENT_ID) {
			errors.push('VITE_OAUTH_CHROME_CLIENT_ID is not set in .env');
		}
	}
	
	if (errors.length > 0) {
		throw new Error(`\nBuild configuration error:\n${errors.map(e => `  - ${e}`).join('\n')}\n\nPlease update your .env file with the required variables.\n`);
	}
	
	return {
		plugins: [preact(), copyBrowserFiles(isFirefox)],
		resolve: {
			alias: {
				'@components': resolve(__dirname, 'src/components'),
				'@config': resolve(__dirname, 'src/config'),
				'@features': resolve(__dirname, 'src/features'),
				'@hooks': resolve(__dirname, 'src/hooks'),
				'@icons': resolve(__dirname, 'public/icons'),
				'@i18n': resolve(__dirname, 'src/i18n'),
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
			outDir: isFirefox ? 'dist-firefox' : 'dist-chrome',
			emptyOutDir: true,
		},
		publicDir: false,
	};
});
