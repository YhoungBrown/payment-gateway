# Payment Gateway Example Backend

A minimal merchant backend for `@org/payment-gateway` that handles Paystack initialization and verification.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/initialize` | Calls Paystack `/transaction/initialize` and returns `checkoutUrl`. |
| POST | `/verify` | Calls Paystack `/transaction/verify/:reference` and returns `{ verified, message }`. |
| GET | `/callback` | Paystack redirect fallback. |
| GET | `/health` | Health check. |

## Local development

```bash
npm install
# Copy .env.example to .env and add your Paystack secret key
cp .env.example .env
npm run dev
```

## Important: callback URL must match the app

The backend tells Paystack where to redirect after payment. The mobile app tells the SDK which URL to watch for in the WebView/popup. These two URLs **must match**.

| Location | Setting | Example |
|----------|---------|---------|
| Backend env | `PAYSTACK_CALLBACK_URL` | `https://your-backend.vercel.app/callback` |
| App config | `ProcessorConfig.callbackUrl` | `https://your-backend.vercel.app/callback` |

If they differ, Paystack will redirect to one URL but the SDK will wait for the other, and the payment will hang.

For local development, the backend derives the callback URL from the incoming request (`http://localhost:3001/callback`). The app should use the same URL.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PAYSTACK_SECRET_KEY` | Yes | Paystack secret key (`sk_test_...` or `sk_live_...`). |
| `PAYSTACK_CALLBACK_URL` | No | Override the callback URL. Defaults to the request host + `/callback`. |

## Deploy to Vercel

1. Push this folder to a Git repo.
2. Import the repo in [Vercel](https://vercel.com).
3. Add `PAYSTACK_SECRET_KEY` in the project environment variables.
4. Deploy.
