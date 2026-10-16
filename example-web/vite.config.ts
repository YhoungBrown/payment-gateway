import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // The SDK packages are linked from the parent SDK repository.
    // Force their React imports to use this app's React instance/version.
    dedupe: ['react', 'react-dom'],
  },
})
