import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const inCodespaces = Boolean(process.env.CODESPACE_NAME);

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.app.github.dev'],
    hmr: inCodespaces ? { protocol: 'wss', clientPort: 443 } : undefined,
    proxy: {
      '/api': 'http://localhost:8787',
      '/ws': { target: 'ws://localhost:8787', ws: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
