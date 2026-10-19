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

Interswitch credentials are loaded from a `.env` file at build time via Vite. The `.env` file is gitignored and never committed.

To set it up locally, copy the provided example file and paste the values into your own `.env`:

```bash
cp env.example .env
```

On Windows:

```cmd
copy env.example .env
```

you can do it manually as well, copy the content of `env.example` , create a new file called `.env` and past the copied data into it

The example values are public sandbox credentials for testing only:

```env
VITE_INTERSWITCH_ENDPOINT=https://sandbox.interswitchng.com/collections/w/pay
VITE_INTERSWITCH_MERCHANT_CODE=MX007
VITE_INTERSWITCH_PAY_ITEM_ID=101007
VITE_INTERSWITCH_PAY_ITEM_NAME=conitepay mobile test app
```

Replace them with your own Interswitch dashboard credentials before using your own processor accounts.

### Checkout callbacks and deployment

The demo uses callback URLs on the app's own origin. [`vercel.json`](./vercel.json) rewrites callback, initialize, and verification paths to the demo backend while keeping the browser-facing URL on the app's origin. Deploy this directory as the Vercel project root for checkout flows that rely on those rewrites. 

To deploy from the command line, make sure you have the Vercel CLI installed and are logged in:

`npm i -g vercel`
`vercel login`

Then build and deploy using your local project settings and rewrites:

`npm run build`
`vercel build --prod`
`vercel deploy --prebuilt --prod --yes`

For local development, [`vite.config.ts`](./vite.config.ts) mirrors the same proxy rules so `npm run dev` works out of the box without deploying to Vercel.

## SDK packages

The app uses `@conitepay/core` and `@conitepay/react` from npm. Run `npm install` in this directory after cloning the repository; no lockfile or `node_modules` directory is required in the example.