import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Polling: native file events on this drive can miss rapid successive saves, leaving stale modules.
  server: { port: 5173, strictPort: true, watch: { usePolling: true, interval: 150 } },
});
