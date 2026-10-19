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
  server: {
    // Mirror the vercel.json rewrites so local development works without
    // deploying to Vercel. These paths are proxied to the demo backend.
    proxy: {
      '/callback': {
        target: 'https://paymentgateway-example-backend.vercel.app',
        changeOrigin: true,
      },
      '/payment-response': {
        target: 'https://paymentgateway-example-backend.vercel.app',
        changeOrigin: true,
      },
      '/flutterwave-callback': {
        target: 'https://paymentgateway-example-backend.vercel.app',
        changeOrigin: true,
      },
      '/initialize': {
        target: 'https://paymentgateway-example-backend.vercel.app',
        changeOrigin: true,
      },
      '/verify': {
        target: 'https://paymentgateway-example-backend.vercel.app',
        changeOrigin: true,
      },
      '/verify-flutterwave': {
        target: 'https://paymentgateway-example-backend.vercel.app',
        changeOrigin: true,
      },
      '/verify-interswitch': {
        target: 'https://paymentgateway-example-backend.vercel.app',
        changeOrigin: true,
      },
    },
  },
})
