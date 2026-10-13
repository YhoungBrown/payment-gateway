# @org/payment-gateway

A TypeScript monorepo payment package for React and React Native. It abstracts Paystack, Flutterwave, and Interswitch behind a single `pay()` API.

It delegates all processor API calls to your own backend through `initialize` and `verify` callbacks, so secret keys never ship in the client.

## Packages

- `@org/payment-gateway-core` — shared types, adapters, context, and reducer.
- `@org/payment-gateway-react` — React bindings (popup checkout).
- `@org/payment-gateway-react-native` — React Native bindings (WebView checkout).

## Example applications

- [`example-mobile/`](./example-mobile/) — React Native checkout example.
- [`example-web/`](./example-web/) — React web checkout example. From that directory, run `npm install` and then `npm run dev`. Its install script installs and builds the local SDK workspaces; no separate SDK build step is needed.

## Features

- Single `pay()` entry point.
- Default processor is launched automatically.
- No default processor? A selector UI is shown (use the built-in one or build your own).
- Backend `initialize` and `verify` callbacks keep secrets server-side.
- Debug logging gated by a provider flag.
- Optional checkout initialization timeout (default 20 s) via `initializeTimeoutMs`. Timed-out processors stay retryable.

## Amount format

All amounts are in **minor units** (kobo for NGN, cents for USD, etc.). The SDK uses
`amount` directly when building a client-side checkout form (Interswitch).

For processors that require server-side initialization, it is your backend's
responsibility to convert if the processor expects major units.

| Processor    | Expects       | Backend should send |
|--------------|---------------|---------------------|
| Paystack     | Minor units   | `request.amount` as-is (e.g. `10000` = ₦100.00) |
| Flutterwave  | Major units   | `request.amount / 100` (e.g. `100` = ₦100.00) |
| Interswitch  | Minor units   | SDK builds the form client-side and sends `request.amount` as-is |

Example backend snippet:

```ts
// In your initialize callback, convert amount for Flutterwave:
if (processor.type === 'flutterwave') {
  const majorAmount = request.amount / 100;
  // ...pass majorAmount to Flutterwave API
}
// Paystack expects kobo — pass request.amount unchanged.
```

## Installation

```bash
npm install @org/payment-gateway-react
# or
npm install @org/payment-gateway-react-native
```

Peer dependencies:

- React web: `react`, `react-dom`
- React Native: `react`, `react-native`, `react-native-webview`

### React Native setup

Install the peer dependency in your app and run the native build steps:

```bash
npm install react-native-webview
# iOS only
npx pod-install
```

> Do not skip these. They are peer dependencies, not bundled dependencies. Bundling them would create duplicate native modules and build failures.

## React usage

```tsx
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
  PaymentProcessorSelector,
} from '@org/payment-gateway-react';

const config = {
  // Remove `debug: true` in production — it enables verbose logging for development only.
  debug: true,
  // Optional: abort checkout initialization after N milliseconds (default 20 000).
  // Timed-out processors stay selectable so the user can retry them.
  // initializeTimeoutMs: 20000,
  processors: [
    {
      id: 'flutterwave-1',
      type: 'flutterwave' as const,
      callbackUrl: 'https://yourapp.com/callback',
      isDefault: true,
    },
    {
      id: 'paystack-1',
      type: 'paystack' as const,
      callbackUrl: 'https://yourapp.com/callback',
    },
  ],
  initialize: async (request, processor) => {
    // Call your backend to initialize the transaction with the processor secret key
    const res = await fetch('/api/payments/initialize', {
      method: 'POST',
      body: JSON.stringify({ request, processor: processor.type }),
    });
    const { checkoutUrl } = await res.json();
    return { checkoutUrl };
  },
  verify: async (response) => {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify(response),
    });
    return res.json(); // { verified: boolean, message?: string }
  },
};

> `isDefault` is optional. Add it to a processor only when you want that processor to launch automatically when `pay()` is called. If no processor has `isDefault: true`, the SDK shows the selector UI.

function App() {
  return (
    <PaymentGatewayProvider config={config}>
      <Checkout />
    </PaymentGatewayProvider>
  );
}

function Checkout() {
  const request = {
    amount: 10000, // minor units
    currency: 'NGN',
    reference: 'ORDER-123',
    email: 'customer@example.com',
    metadata: { orderId: 'ORDER-123' },
  };

  const { pay, isProcessing, isSelecting, response, error, selectProcessor, cancelSelection, failedProcessorIds } =
    usePayment(request);
  const { processors } = usePaymentProcessors();

  return (
    <div>
      <button onClick={pay} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Pay'}
      </button>
      {error && <p>Error: {error.message}</p>}
      {response && <p>Status: {response.status}</p>}
      <PaymentProcessorSelector
        open={isSelecting}
        processors={processors}
        onSelect={selectProcessor}
        onCancel={cancelSelection}
        failedProcessorIds={failedProcessorIds}
      />
    </div>
  );
}
```

## React Native usage

```tsx
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
  PaymentProcessorSelector,
} from '@org/payment-gateway-react-native';
import { Button, Text, View } from 'react-native';

const config = {
  // Remove `debug: true` in production — it enables verbose logging for development only.
  debug: true,
  // Optional: abort checkout initialization after N milliseconds (default 20 000).
  // Timed-out processors stay selectable so the user can retry them.
  // initializeTimeoutMs: 20000,
  processors: [
    {
      id: 'flutterwave-1',
      type: 'flutterwave' as const,
      callbackUrl: 'https://yourapp.com/callback',
      isDefault: true,
    },
  ],
  initialize: async (request, processor) => {
    const res = await fetch('https://yourapi.com/initialize', {
      method: 'POST',
      body: JSON.stringify({ request, processor: processor.type }),
    });
    const { checkoutUrl } = await res.json();
    return { checkoutUrl };
  },
  verify: async (response) => {
    const res = await fetch('https://yourapi.com/verify', {
      method: 'POST',
      body: JSON.stringify(response),
    });
    return res.json();
  },
};

function App() {
  return (
    <PaymentGatewayProvider config={config}>
      <Checkout />
    </PaymentGatewayProvider>
  );
}

function Checkout() {
  const request = {
    amount: 10000,
    currency: 'NGN',
    reference: 'ORDER-123',
    email: 'customer@example.com',
  };

  const { pay, isProcessing, isSelecting, showProcessorSelector, response, error, CheckoutView, selectProcessor, cancelSelection, activeProcessorId } =
    usePayment(request);
  const { processors } = usePaymentProcessors();

  return (
    <View>
      <Button title={isProcessing ? 'Processing...' : 'Pay'} onPress={pay} disabled={isProcessing} />
      {error && <Text>Error: {error.message}</Text>}
      {response && <Text>Status: {response.status}</Text>}
      {CheckoutView}
      <PaymentProcessorSelector
        open={showProcessorSelector}
        processors={processors}
        onSelect={selectProcessor}
        onCancel={cancelSelection}
        isProcessing={isProcessing}
        activeProcessorId={activeProcessorId}
        activityIndicatorColor="#007AFF"
      />
    </View>
  );
}
```

## Class component support (React Native)

Hooks can only be used inside function components. If your screen is a class component, wrap it with `withPaymentGateway` instead.

`withPaymentGateway` is a higher-order component that injects the same values returned by `usePayment` and `usePaymentProcessors` as props.

### Usage

```tsx
import React, { Component } from 'react';
import { View, Button, Text } from 'react-native';
import {
  PaymentGatewayProvider,
  withPaymentGateway,
  PaymentProcessorSelector,
  type WithPaymentGatewayProps,
} from '@org/payment-gateway-react-native';

class CheckoutScreen extends Component<WithPaymentGatewayProps> {
  render() {
    const {
      pay,
      selectProcessor,
      cancelSelection,
      isProcessing,
      isSelecting,
      showProcessorSelector,
      activeProcessorId,
      failedProcessorIds,
      timedOutProcessorIds,
      response,
      error,
      CheckoutView,
      processors,
    } = this.props;

    return (
      <View>
        <Button
          title={isProcessing ? 'Processing...' : 'Pay'}
          onPress={() => pay()}
          disabled={isProcessing}
        />
        {error && <Text>Error: {error.message}</Text>}
        {response && <Text>Status: {response.status}</Text>}
        {CheckoutView}
        <PaymentProcessorSelector
          open={showProcessorSelector}
          processors={processors}
          onSelect={selectProcessor}
          onCancel={cancelSelection}
          isProcessing={isProcessing}
          activeProcessorId={activeProcessorId}
          failedProcessorIds={failedProcessorIds}
          timedOutProcessorIds={timedOutProcessorIds}
          activityIndicatorColor="#007AFF"
        />
      </View>
    );
  }
}

const CheckoutScreenWithGateway = withPaymentGateway(CheckoutScreen);

function App() {
  const request = {
    amount: 10000,
    currency: 'NGN',
    reference: 'ORDER-123',
    email: 'customer@example.com',
  };

  return (
    <PaymentGatewayProvider config={config}>
      <CheckoutScreenWithGateway request={request} />
    </PaymentGatewayProvider>
  );
}
```

### Keeping the selector open during initialization (React Native)

After a user selects a processor, the selector should remain visible with that processor's loading indicator while the checkout is being prepared. Once the checkout WebView is ready, the selector closes so the WebView can take over.

The SDK provides `showProcessorSelector` directly from `usePayment` (and from `withPaymentGateway`). It handles the selector visibility correctly for both manual selection and default-processor flows:

```tsx
const { showProcessorSelector } = usePayment(request);

<PaymentProcessorSelector
  open={showProcessorSelector}
  // ...
/>
```

This keeps the selector open during manual selection and initialization, including the short transition before the WebView is mounted, while keeping it hidden during automatic default-processor initialization and during the redirect/verification phase after the WebView closes.

If building a custom selector UI, use `showProcessorSelector` for visibility and `isProcessing` plus `activeProcessorId` to show the selected processor's loading state.

### Custom selector row with `renderItem` (React Native)

You can keep the SDK's modal and backdrop while customizing only the processor row:

```tsx
<PaymentProcessorSelector
  open={showProcessorSelector}
  processors={processors}
  onSelect={selectProcessor}
  onCancel={cancelSelection}
  isProcessing={isProcessing}
  activeProcessorId={activeProcessorId}
  failedProcessorIds={failedProcessorIds}
  timedOutProcessorIds={timedOutProcessorIds}
  activityIndicatorColor="#007AFF"
  presentation="fullscreen"
  backgroundColor="blue"
  renderItem={({ processor, onSelect, isLoading, isFailed, isTimedOut }) => (
    <TouchableOpacity
      onPress={onSelect}
      disabled={isLoading || (isFailed && !isTimedOut)}
      style={{ opacity: isFailed && !isTimedOut ? 0.4 : isLoading ? 0.6 : 1 }}
    >
      <Text>
        {processor.type.toUpperCase()}
        {isFailed && !isTimedOut && ' — Unavailable'}
        {isTimedOut && ' — Timed out'}
      </Text>
      {isLoading && <ActivityIndicator color="#007AFF" />}
    </TouchableOpacity>
  )}
/>
```

### Custom selector row with `renderItem` (React web)

The web `PaymentProcessorSelector` does not have a loading phase — the popup opens immediately after selection, so `renderItem` receives `processor`, `onSelect`, `isFailed`, and `isTimedOut` only:

```tsx
<PaymentProcessorSelector
  open={isSelecting}
  processors={processors}
  onSelect={selectProcessor}
  onCancel={cancelSelection}
  failedProcessorIds={failedProcessorIds}
  timedOutProcessorIds={timedOutProcessorIds}
  renderItem={({ processor, onSelect, isFailed, isTimedOut }) => (
    <button onClick={onSelect} disabled={isFailed && !isTimedOut} style={{ opacity: isFailed && !isTimedOut ? 0.4 : 1 }}>
      {processor.type.toUpperCase()}
      {isFailed && !isTimedOut && ' — Unavailable'}
      {isTimedOut && ' — Timed out'}
    </button>
  )}
/>
```

### Full-screen or fully custom selector shell (React web)

The web `PaymentProcessorSelector` currently lets you customize the **processor rows** with `renderItem`, but it does not expose props to restyle or resize its modal shell (for example, to make the built-in modal full-screen). `renderItem` only changes the rows; it does not change the built-in backdrop, panel, title, or cancel-button layout.

To make the entire selector full-screen or match your app's design, render your own selector UI instead of `PaymentProcessorSelector`. Use `isSelecting` to control its visibility in the React web package, and use `processors`, `selectProcessor`, `cancelSelection`, and `failedProcessorIds` from the hooks:

```tsx
function Checkout() {
  const request = {
    amount: 10000,
    currency: 'NGN',
    reference: 'ORDER-123',
    email: 'customer@example.com',
  };

  const {
    pay,
    selectProcessor,
    cancelSelection,
    isSelecting,
    isProcessing,
    failedProcessorIds,
    timedOutProcessorIds,
  } = usePayment(request);
  const { processors } = usePaymentProcessors();

  return (
    <>
      <button onClick={pay} disabled={isProcessing}>
        {isProcessing ? 'Processing…' : 'Pay'}
      </button>

      {isSelecting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Select a payment method"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: 24,
            background: 'white',
          }}
        >
          <h2>Select a payment method</h2>
          {processors.map((processor) => {
            const isFailed = failedProcessorIds.includes(processor.id);
            const isTimedOut = timedOutProcessorIds.includes(processor.id);
            return (
              <button
                key={processor.id}
                onClick={() => selectProcessor(processor.id)}
                disabled={isFailed && !isTimedOut}
              >
                {processor.type.toUpperCase()}
                {isFailed && !isTimedOut ? ' — Unavailable' : ''}
                {isTimedOut ? ' — Timed out' : ''}
              </button>
            );
          })}
          <button onClick={cancelSelection}>Cancel</button>
        </div>
      )}
    </>
  );
}
```

Replace the inline styles with your own CSS/design system to control the full-screen layout, backdrop, spacing, animations, and responsive behavior. Keep failed processors disabled as shown so a processor that failed cannot be retried in the same payment attempt. The `showProcessorSelector` value is intended for the React Native selector flow; for this React web custom selector, use `isSelecting`.

### Fully custom selector (React Native)

For React Native, if you build your own selector component, use `showProcessorSelector` for visibility and `isProcessing` / `activeProcessorId` to show the loading state. If your component is a Modal, pass `visible={showProcessorSelector}` instead of conditionally rendering it. For a fully custom React web selector—including a full-screen design—use the web-specific example above and control visibility with `isSelecting`:

```tsx
<CustomProcessorSelector
  processors={processors}
  onSelect={selectProcessor}
  onCancel={cancelSelection}
  activeProcessorId={activeProcessorId}
  isProcessing={isProcessing}
  failedProcessorIds={failedProcessorIds}
  timedOutProcessorIds={timedOutProcessorIds}
  visible={showProcessorSelector}
/>
```

### Injected props

`withPaymentGateway` injects everything from `usePayment` and `usePaymentProcessors`:

| Prop | Type | Description |
|------|------|-------------|
| `pay` | `() => Promise<PaymentResponse>` | Starts the payment flow. |
| `selectProcessor` | `(processorId: string) => Promise<PaymentResponse>` | Selects a processor when no default is set. |
| `cancelSelection` | `() => void` | Cancels the processor selector. |
| `isProcessing` | `boolean` | True while initializing, processor selection, processing, or verifying. |
| `isSelecting` | `boolean` | True when the user needs to pick a processor or while the selected processor is initializing. |
| `showProcessorSelector` | `boolean` | Ready-to-use visibility flag for `PaymentProcessorSelector.open` and custom selectors. |
| `activeProcessorId` | `string \| undefined` | The processor currently being initialized/used. |
| `response` | `PaymentResponse \| undefined` | Final payment response after completion. |
| `error` | `Error \| null` | Last error, if any. |
| `CheckoutView` | `React.ReactNode` | Render this to show the checkout WebView. |
| `reset` | `() => void` | Resets the payment state. |
| `timedOutProcessorIds` | `string[]` | IDs of processors whose initialization timed out. Unlike failed processors, these can be retried in the same payment attempt. |
| `processors` | `ProcessorConfig[]` | All configured processors. |
| `defaultProcessor` | `ProcessorConfig \| undefined` | The processor marked as default, if any. |

The wrapped component must receive a `request` prop of type `PaymentRequest`.

## Flutterwave Standard checkout

The Flutterwave adapter uses Flutterwave's Standard (hosted) flow. Your backend initializes the payment with your Flutterwave secret key and returns the hosted checkout link. The SDK then opens that link in a WebView (React Native) or popup (web).

```ts
const config = {
  processors: [
    {
      id: 'flutterwave-1',
      type: 'flutterwave' as const,
      callbackUrl: 'https://yourapp.com/flutterwave-callback',
      isDefault: true,
    },
  ],
  initialize: async (request, processor) => {
    const res = await fetch('/api/payments/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, processor }),
    });
    const { checkoutUrl } = await res.json();
    return { checkoutUrl };
  },
  verify: async (response) => {
    const res = await fetch('/api/payments/verify-flutterwave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });
    return res.json(); // { verified: boolean, message?: string }
  },
};
```

Your backend should call `POST https://api.flutterwave.com/v3/payments` to create the payment and return `{ checkoutUrl: data.data.link }`. Flutterwave expects the amount in the currency's major unit (e.g. NGN Naira, not kobo). See [Amount format](#amount-format) for conversion guidance.

After payment, Flutterwave redirects to `redirect_url` with `status`, `tx_ref`, and `transaction_id`. The SDK parses these into a `PaymentResponse`. Use `response.processorReference` (the Flutterwave `transaction_id`) in your `verify` callback to confirm the payment server-to-server via `GET https://api.flutterwave.com/v3/transactions/{transaction_id}/verify`.

## Interswitch Web Checkout client-side initialization

The Interswitch adapter builds a client-side POST form. You must obtain the checkout endpoint, `merchantCode`, and `payItemId` from your Interswitch account.

```ts
const config = {
  processors: [
    {
      id: 'interswitch-1',
      type: 'interswitch' as const,
      callbackUrl: 'https://yourapp.com/payment-response',
      endpoint: 'https://<interswitch-checkout-host>/collections/w/pay',
      merchantCode: 'YOUR_MERCHANT_CODE',
      payItemId: 'YOUR_PAY_ITEM_ID',
      payItemName: 'Your Product Name', // optional
    },
  ],
};
```

> Do not hardcode Interswitch URLs in your SDK config. Use the endpoint provided by Interswitch for your environment (sandbox or production).

### React Native WebView checkout

In React Native, all processors open inside a WebView. The Interswitch adapter builds a client-side POST form and submits it directly in the WebView.

## Verification

The `verify` callback is **required**. Paystack and Interswitch do not embed an
authoritative payment status in their callback URLs (Paystack returns only a
reference; Interswitch returns only a transaction reference). Even for
Flutterwave, which does include a status, server-side verification is the
only way to confirm a payment independently of the client.

The `verify` callback is always called after the checkout WebView or popup
closes. If it returns `{ verified: true }`, the SDK reports `success`. If it
returns `{ verified: false }`, the SDK reports `failed`.

### Single processor

```ts
const config = {
  processors: [
    {
      id: 'paystack-1',
      type: 'paystack' as const,
      callbackUrl: 'https://yourapp.com/callback',
      isDefault: true,
    },
  ],
  verify: async (response) => {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ reference: response.reference }),
    });
    return res.json(); // { verified: boolean, message?: string }
  },
};
```

### Multiple processors

The `verify` callback receives `response.processor`, so one function can handle all processors.

```ts
const config = {
  processors: [
    {
      id: 'paystack-1',
      type: 'paystack' as const,
      callbackUrl: 'https://yourapp.com/callback',
      isDefault: true,
    },
    {
      id: 'flutterwave-1',
      type: 'flutterwave' as const,
      callbackUrl: 'https://yourapp.com/callback',
    },
    {
      id: 'interswitch-1',
      type: 'interswitch' as const,
      callbackUrl: 'https://yourapp.com/payment-response',
      endpoint: 'https://<interswitch-checkout-host>/collections/w/pay',
      merchantCode: 'YOUR_MERCHANT_CODE',
      payItemId: 'YOUR_PAY_ITEM_ID',
      payItemName: 'Your Product Name',
    },
  ],
  verify: async (response) => {
    switch (response.processor) {
      case 'paystack':
        return verifyOnBackend('/api/payments/verify/paystack', response.reference);
      case 'flutterwave':
        return verifyOnBackend('/api/payments/verify/flutterwave', response.processorReference);
      case 'interswitch':
        // Your backend should call Interswitch's requery endpoint:
        // GET https://sandbox.interswitchng.com/collections/api/v1/gettransaction.json?merchantcode={merchantcode}&transactionreference={reference}&amount={amount}
        return verifyOnBackend('/api/payments/verify/interswitch', response.reference);
      default:
        // Only reachable if you add a processor type without updating verify.
        // If you do not need verification, omit verify entirely.
        return { verified: false, message: 'Verification not configured for this processor' };
    }
  },
};
```

### Verification flow

1. The user completes payment in a popup (web) or WebView (React Native).
2. The package parses the callback URL into a `PaymentResponse`.
3. The `verify` callback is called. If it returns `{ verified: true }`, the SDK returns `success`.
4. If `verify` returns `{ verified: false }`, the SDK returns `status: 'failed'` with the verification message.

## Processor fallback

If you configure multiple processors and the default processor's checkout fails to load or initialize, the SDK automatically falls back to the processor selector so the user can choose another processor. The failed processor is shown as **Unavailable** and is disabled for the rest of the current payment attempt.

If initialization takes too long (default 20 seconds), the processor is shown as **Timed out** but remains selectable — the user can try it again without restarting the whole flow. Customize the timeout with `initializeTimeoutMs` in the config.

The fallback and timeout lists clear when the user starts a new payment (for example, by tapping Pay again).

If only one processor is configured and it fails or times out, the SDK ends the flow and reports a failed payment.

## Callback URL matching

The `callbackUrl` you set in `ProcessorConfig` must match the callback URL configured on your backend/processor. The SDK watches the checkout WebView/popup for navigation to this URL.

| Processor | Who sets the callback URL | Where to configure |
|-----------|---------------------------|-------------------|
| Paystack | Your backend | Set in backend and pass the same value to `ProcessorConfig.callbackUrl`. |
| Flutterwave | Your backend | Set in backend and pass the same value to `ProcessorConfig.callbackUrl`. |
| Interswitch | Your backend or client | Set `ProcessorConfig.callbackUrl` to the same URL passed as `site_redirect_url`. |

If the URLs do not match, the SDK will not detect the payment completion.

### Same-origin requirement (web only)

**For web apps**, the `callbackUrl` must use the same origin (protocol + hostname + port) as the web app page. The SDK monitors the checkout popup and needs to read its URL when the processor redirects back. Browser security prevents the app from reading a popup URL while it is on a different origin. When the callback uses the app's origin, the SDK can recognize the callback, close the popup, and continue to `verify`.

This requirement is specific to the web popup. React Native uses a WebView and can intercept its navigation URL directly; its callback does not need to share the app's origin.

**This does not mean every SDK user must deploy to Vercel or configure rewrites.** If your web app and callback are already on the same origin, the SDK can detect the callback without any additional routing configuration. A frontend-host rewrite is only needed when your callback/backend is on a different origin from your web app and you want the browser-facing callback URL to remain same-origin.

#### Local development with a separate-origin backend

For example, `npm run dev` may serve a web app at `http://localhost:5173` while its callback points to `https://api.theirstore.com/callback`. These are different origins. The browser blocks the app from reading the popup's URL after it navigates to the API callback, so the SDK cannot detect that callback; the popup may remain open on the backend's callback response. A frontend-host proxy/rewrite can address this by making the callback path appear under the app's origin. Alternatively, use a local backend/callback on the same origin if your development setup supports it.

This is an origin restriction in browser popup security, not a Vite-specific limitation. It applies whenever a web app's checkout popup returns to a different origin.

#### Scenario 1: Same origin already (easiest)

If your backend and frontend are on the same domain, you don't need to change anything:

```
Frontend:  https://theirstore.com
Backend:   https://theirstore.com/api/*
Callback:  https://theirstore.com/callback
```

The processor redirects the popup to `https://theirstore.com/callback` — the same origin as the parent page. No proxy or rewrite is needed for origin purposes. The SDK detects the callback, closes the popup, and calls `verify`.

#### Scenario 2: Separate API subdomain (common)

If your frontend and backend are on different subdomains:

```
Frontend:  https://theirstore.com
Backend:   https://api.theirstore.com
Callback:  https://api.theirstore.com/callback   ← cross-origin, won't work
```

In this setup, make the callback path on the frontend's origin forward to the backend server-side. This is a **reverse proxy/rewrite at the frontend's hosting or web-server layer**; it is not a browser redirect. The browser continues to see the frontend origin while that server forwards the request to the API. Your processor's `callbackUrl` must point to your **frontend** domain:

```
callbackUrl: 'https://theirstore.com/callback'
```

The browser sees `https://theirstore.com/callback`, and the hosting layer forwards the request to `https://api.theirstore.com/callback` without changing the URL shown in the popup.

**Next.js** — configure the frontend hosting/server (`next.config.js`):

```js
module.exports = {
  async rewrites() {
    return [
      { source: '/callback', destination: 'https://api.theirstore.com/callback' },
      { source: '/payment-response', destination: 'https://api.theirstore.com/payment-response' },
      { source: '/flutterwave-callback', destination: 'https://api.theirstore.com/flutterwave-callback' },
    ];
  },
};
```

**Vercel** — configure rewrites in the frontend project's `vercel.json` so Vercel keeps the browser on the frontend origin while forwarding the request to your backend:

```json
{
  "rewrites": [
    { "source": "/callback", "destination": "https://api.theirstore.com/callback" },
    { "source": "/payment-response", "destination": "https://api.theirstore.com/payment-response" },
    { "source": "/flutterwave-callback", "destination": "https://api.theirstore.com/flutterwave-callback" },
    { "source": "/initialize", "destination": "https://api.theirstore.com/initialize" },
    { "source": "/verify", "destination": "https://api.theirstore.com/verify" },
    { "source": "/verify-flutterwave", "destination": "https://api.theirstore.com/verify-flutterwave" },
    { "source": "/verify-interswitch", "destination": "https://api.theirstore.com/verify-interswitch" }
  ]
}
```

Add the callback paths and the initialize/verification API paths your integration actually uses. These rewrites belong to the service serving the **frontend origin**. Other frontend hosting platforms (such as Netlify, Cloudflare, or NGINX) provide equivalent reverse-proxy/rewrite configuration; configure the rules there if you do not host the frontend on Vercel. The frontend build tool does not determine where these production rules go.

> **React Native:** This same-origin setup is not required. React Native uses a WebView that can intercept navigation URLs before the callback page loads.

## Metadata

You can attach arbitrary business data to a payment via the `metadata` field on `PaymentRequest`:

```ts
const request: PaymentRequest = {
  amount: 10000,
  currency: 'NGN',
  reference: 'ORDER-123',
  email: 'customer@example.com',
  metadata: {
    orderId: 'ORDER-123',
    customerId: 'CUST-456',
  },
};
```

Your backend receives `request.metadata` in the `initialize` callback and can forward it to the processor.

## Scripts

```bash
npm run build      # Build all packages
npm run typecheck  # Type-check all packages
npm run test       # Run unit tests
npm run test:e2e   # Run Playwright web E2E tests
npm run lint       # Lint all packages
npm run clean      # Remove build output
```

## License

MIT
