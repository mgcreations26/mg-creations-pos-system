import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'MgCreations POS ERP',
        short_name: 'MgCreations',
        display: 'standalone'
      }
    })
  ],
  server: {
    host: '0.0.0.0',
    port: 3000
  }
});