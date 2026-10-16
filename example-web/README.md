# Example Web App

This is the React web example for `@conitepay/react`. It demonstrates Paystack, Flutterwave, and Interswitch checkout using the demo backend.

## Requirements

- Node.js 18 or newer
- npm

## Install and run

From this directory:

```bash
npm install
npm run dev
```

The SDK packages are installed from npm. No local SDK build step is required.

To create a production build locally:

```bash
npm run build
npm run preview
```

## Configuration

### Interswitch credentials

Interswitch credentials are set in the `.env` file. Get them from your Interswitch dashboard and update `.env` before running the app. The `.env` file is gitignored and never committed.

### Checkout callbacks and deployment

The demo uses callback URLs on the app's own origin. [`vercel.json`](./vercel.json) rewrites callback, initialize, and verification paths to the demo backend while keeping the browser-facing URL on the app's origin. Deploy this directory as the Vercel project root for checkout flows that rely on those rewrites.

The demo intentionally does not configure a Vite development proxy. During `npm run dev`, the app is served from `localhost` while the backend is on another origin, so the demo's relative initialize and verification paths and popup callback flow are not configured to work locally. This is specific to the demo setup; an app whose backend/callback already shares its origin does not need Vercel or rewrites.

## SDK packages

The app uses `@conitepay/core` and `@conitepay/react` from npm. Run `npm install` in this directory after cloning the repository; no lockfile or `node_modules` directory is required in the example.

The Interswitch values in `.env` are sandbox checkout fields for testing only. Replace them and review the backend configuration before using your own processor accounts.