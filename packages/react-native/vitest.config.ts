import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Force all React imports to resolve to the workspace root instance.
      // Without this, the workspace packages can pull in different React copies
      // and React hooks fail with "Invalid hook call".
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      // Use the core source directly in tests so it shares the same React
      // instance as this package.
      '@conitepay/core': path.resolve(__dirname, '../core/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});
