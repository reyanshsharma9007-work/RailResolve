import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Must match CLIENT_ORIGIN in railresolve-express-backend/.env,
    // otherwise the Express CORS layer rejects every request.
    port: 5173,
    open: true,
  },
});
