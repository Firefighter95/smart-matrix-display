import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 4096,
    sourcemap: false,
    cssMinify: 'esbuild',
  },
  server: {
    fs: { allow: ['..'] },
  },
});

