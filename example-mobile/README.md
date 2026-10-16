# Example Mobile App

This is the official React Native example app for `@conitepay/react-native`.
It demonstrates Paystack, Flutterwave, and Interswitch checkout in a real React Native project.

## Setup

```bash
cd example-mobile
npm install
```

### iOS only

```bash
cd ios && pod install && cd ..
```

## Configuration

### Interswitch credentials

Edit `.env` with your Interswitch sandbox credentials. The `.env` file is gitignored and never committed. Values are loaded at build time via `react-native-dotenv`.

```env
INTERSWITCH_ENDPOINT=https://sandbox.interswitchng.com/collections/w/pay
INTERSWITCH_MERCHANT_CODE=your_merchant_code
INTERSWITCH_PAY_ITEM_ID=your_pay_item_id
INTERSWITCH_PAY_ITEM_NAME=Your Product Name
```

Get these from your Interswitch dashboard.

### Backend

By default the app points to the example backend at `https://paymentgateway-example-backend.vercel.app`.

To use your own backend, change `baseUrl` in `App.tsx`:

```tsx
const baseUrl = 'https://your-backend.com';
```

## Run

```bash
npx react-native run-android
# or
npx react-native run-ios
```

## SDK packages

The app uses `@conitepay/core` and `@conitepay/react-native` from npm. Run `npm install` to install them.

### Checkout initialization timeout

If a processor's checkout takes too long to initialize (default 20 seconds, configurable via `initializeTimeoutMs`), the SDK shows a **Timed out** label on that processor in the selector. Unlike unavailable processors, timed-out processors are not disabled and can be retried in the same payment attempt.