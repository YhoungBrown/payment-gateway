# Example Mobile App

This is the official React Native example app for `@conitepay/react-native`.
It demonstrates Paystack, Flutterwave, and Interswitch checkout in a real React Native project.

## Setup

```bash
cd example-mobile
npm install
```

### Environment variables

This project uses `react-native-dotenv` to load environment variables at build time. The `.env` file is gitignored and is never committed, so you must create it locally from the provided example:

```bash
cp env.example .env
```

Or on Windows:

```cmd
copy env.example .env
```

you can do it manually as well, copy the content of `env.example` , create a new file called `.env` and past the copied data into it

### iOS only

```bash
cd ios && pod install && cd ..
```

### Android SDK

Gradle needs to know where your Android SDK is installed. Set the `ANDROID_HOME` environment variable, or create `android/local.properties` with your SDK path:

```properties
sdk.dir=C:\\Users\\<YourUser>\\AppData\\Local\\Android\\Sdk
```

On macOS/Linux:

```properties
sdk.dir=/Users/<YourUser>/Library/Android/sdk
```

## Configuration

### Interswitch credentials

Edit `.env` with your Interswitch sandbox credentials. The `.env` file is gitignored and never committed. Values are loaded at build time via `react-native-dotenv`.

```env
INTERSWITCH_ENDPOINT=https://sandbox.interswitchng.com/collections/w/pay
INTERSWITCH_MERCHANT_CODE=MX6072
INTERSWITCH_PAY_ITEM_ID=9405967
INTERSWITCH_PAY_ITEM_NAME=conitepay mobile test app
```

Get production credentials from your Interswitch dashboard. The example values above are public sandbox samples.

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