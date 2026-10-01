import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',

    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },

      '/users': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },

      '/companies': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },

      '/projects': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});