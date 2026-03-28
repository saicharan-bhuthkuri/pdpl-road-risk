import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // No proxy needed — fully frontend-only, backend deprecated
  build: {
    outDir: 'dist',
    // Increase chunk size limit for the large road_network.json
    chunkSizeWarningLimit: 1000,
  }
})
