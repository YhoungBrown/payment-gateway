# @conitepay/react

React bindings for the ConitePay payment gateway. Opens checkout in a popup window. It abstracts Paystack, Flutterwave, and Interswitch behind a single `pay()` API.

It delegates all processor API calls to your own backend through `initialize` and `verify` callbacks, so secret keys never ship in the client.

> **Building for React Native?** Install `@conitepay/react-native` instead. The concepts and config are the same across both packages.

## Installation

```bash
npm install @conitepay/react
```

## Peer dependencies

- `react` >= 18.0.0
- `react-dom` >= 18.0.0

## Features

- Single `pay()` entry point.
- Default processor is launched automatically.
- No default processor? A selector UI is shown (use the built-in one or build your own).
- Backend `initialize` and `verify` callbacks keep secrets server-side.
- Optional checkout initialization timeout (default 20 s) via `initializeTimeoutMs`. Timed-out processors stay retryable.

## Quick start

```tsx
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
  PaymentProcessorSelector,
} from '@conitepay/react';

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

`isDefault` is optional. Add it to a processor only when you want that processor to launch automatically when `pay()` is called. If no processor has `isDefault: true`, the SDK shows the selector UI.

## Custom selector row with `renderItem`

You can keep the SDK's modal and backdrop while customizing only the processor row. On web there is no loading phase — the popup opens immediately after selection, so `renderItem` receives `processor`, `onSelect`, `isFailed`, and `isTimedOut`:

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
      {isFailed && !isTimedOut && ' Unavailable'}
      {isTimedOut && ' Timed out'}
    </button>
  )}
/>
```

## Full screen or fully custom selector shell

The built-in `PaymentProcessorSelector` allows customizing processor rows with `renderItem`, but it does not expose props to restyle or resize its modal shell (for example, to make the built-in modal full screen). `renderItem` only changes the rows; it does not change the built-in backdrop, panel, title, or cancel button layout.

To make the entire selector full screen or match your app's design, render your own selector UI instead of `PaymentProcessorSelector`. Use `isSelecting` to control its visibility and use `processors`, `selectProcessor`, `cancelSelection`, `failedProcessorIds`, and `timedOutProcessorIds` from the hooks:

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
                {isFailed && !isTimedOut ? ' Unavailable' : ''}
                {isTimedOut ? ' Timed out' : ''}
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

Replace the inline styles with your own CSS/design system to control the full screen layout, backdrop, spacing, animations, and responsive behavior. Keep failed processors disabled as shown so a processor that failed cannot be retried in the same payment attempt. Use `isSelecting` (not `showProcessorSelector`) to control visibility of a fully custom web selector.

## Amount format

All amounts are in **minor units** (kobo for NGN, cents for USD, etc.).

| Processor    | Expects      | Backend should send                                 |
|--------------|-------------|-----------------------------------------------------|
| Paystack     | Minor units | `request.amount` as is (e.g. `10000` = ₦100.00)     |
| Flutterwave  | Major units | `request.amount / 100` (e.g. `100` = ₦100.00)       |
| Interswitch  | Minor units | SDK builds the form client-side and sends `request.amount` as is |

## Verification

The `verify` callback is **required**. The SDK calls `verify` after the checkout popup closes. If it returns `{ verified: true }`, the SDK reports `success`. If it returns `{ verified: false }`, the SDK reports `failed`.

```ts
// Single processor
const config = {
  processors: [{ id: 'paystack-1', type: 'paystack' as const, callbackUrl: 'https://yourapp.com/callback', isDefault: true }],
  verify: async (response) => {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      body: JSON.stringify({ reference: response.reference }),
    });
    return res.json();
  },
};

// Multiple processors — response.processor tells you which one completed
const config = {
  processors: [
    { id: 'paystack-1', type: 'paystack' as const, callbackUrl: '...', isDefault: true },
    { id: 'flutterwave-1', type: 'flutterwave' as const, callbackUrl: '...' },
    { id: 'interswitch-1', type: 'interswitch' as const, callbackUrl: '...', endpoint: '...', merchantCode: '...', payItemId: '...' },
  ],
  verify: async (response) => {
    switch (response.processor) {
      case 'paystack': return verifyOnBackend('/api/payments/verify/paystack', response.reference);
      case 'flutterwave': return verifyOnBackend('/api/payments/verify/flutterwave', response.processorReference);
      case 'interswitch': return verifyOnBackend('/api/payments/verify/interswitch', response.reference);
      default: return { verified: false, message: 'Verification not configured' };
    }
  },
};
```

## Processor fallback

If you configure multiple processors and the default processor's checkout fails to load or initialize, the SDK automatically falls back to the processor selector so the user can choose another processor. The failed processor is shown as **Unavailable** and is disabled for the rest of the current payment attempt.

If initialization takes too long (default 20 seconds), the processor is shown as **Timed out** but remains selectable — the user can try it again without restarting the whole flow. Customize the timeout with `initializeTimeoutMs` in the config.

The fallback and timeout lists clear when the user starts a new payment (for example, by clicking Pay again).

## Callback URL matching

For web apps, the `callbackUrl` must use the same origin (protocol + hostname + port) as the web app page. The SDK monitors the checkout popup and needs to read its URL when the processor redirects back. Browser security prevents the app from reading a popup URL while it is on a different origin.

If your backend and frontend are on the same domain, no extra config is needed. If they are on different domains (for example frontend at `theirstore.com`, backend at `api.theirstore.com`), configure a reverse proxy or URL rewrite at your frontend hosting layer so the callback path appears under the frontend's origin.

Use any hosting platform that supports reverse proxies (Next.js, Netlify, Cloudflare, NGINX, Vercel, etc.):

```js
// next.config.js
module.exports = {
  async rewrites() {
    return [
      { source: '/callback', destination: 'https://api.theirstore.com/callback' },
    ];
  },
};
```

```json
// vercel.json
{
  "rewrites": [
    { "source": "/callback", "destination": "https://api.theirstore.com/callback" }
  ]
}
```

Add the callback paths and initialize/verification API paths your integration actually uses. If your platform uses a different mechanism (for example Netlify redirects, Cloudflare Workers, or NGINX `proxy_pass`), configure the equivalent reverse proxy rules there.

## React Native usage

If you are building for React Native, install `@conitepay/react-native` instead:

```bash
npm install @conitepay/react-native react-native-webview
```

The concepts and config are identical. The key differences are:

- Checkout opens in a WebView instead of a popup.
- `showProcessorSelector` replaces `isSelecting` for selector visibility (it handles the loading phase between selection and WebView mount).
- `CheckoutView` is a ReactNode you render in your component tree.
- Class components are supported via `withPaymentGateway`.

```tsx
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
  PaymentProcessorSelector,
} from '@conitepay/react-native';
import { Button, Text, View } from 'react-native';

function Checkout() {
  const request = { amount: 10000, currency: 'NGN', reference: 'ORDER-123', email: 'customer@example.com' };
  const { pay, isProcessing, showProcessorSelector, response, error, CheckoutView, selectProcessor, cancelSelection, activeProcessorId, failedProcessorIds, timedOutProcessorIds } =
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
        failedProcessorIds={failedProcessorIds}
        timedOutProcessorIds={timedOutProcessorIds}
        activityIndicatorColor="#007AFF"
        //presentation="fullscreen"   // Uncomment to show the selector as a full-screen modal
        //backgroundColor="blue"      // Uncomment to change the background color of the selector modal
      />
    </View>
  );
}
```

See the [`@conitepay/react-native` README](https://www.npmjs.com/package/@conitepay/react-native) for class component support and fully custom selector examples.

## License

MIT