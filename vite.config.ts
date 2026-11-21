import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// In development the Express server (server/index.ts) mounts Vite as middleware,
// so the frontend and the /api routes share one port. `npm run build` outputs ./dist,
// which Express serves in production.
export default defineConfig({
  plugins: [react(), tailwindcss()]
});
