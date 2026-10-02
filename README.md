# @org/payment-gateway

A TypeScript monorepo payment package for React and React Native. It abstracts Paystack, Flutterwave, and Interswitch behind a single `pay()` API.

It delegates all processor API calls to your own backend through `initialize` and `verify` callbacks, so secret keys never ship in the client.

## Packages

- `@org/payment-gateway-core` — shared types, adapters, context, and reducer.
- `@org/payment-gateway-react` — React bindings (popup checkout).
- `@org/payment-gateway-react-native` — React Native bindings (WebView checkout).

## Features

- Single `pay()` entry point.
- Default processor is launched automatically.
- No default processor? A selector UI is shown (use the built-in one or build your own).
- Backend `initialize` and `verify` callbacks keep secrets server-side.
- Debug logging gated by a provider flag.

## Installation

```bash
npm install @org/payment-gateway-react
# or
npm install @org/payment-gateway-react-native
```

Peer dependencies:

- React web: `react`, `react-dom`
- React Native: `react`, `react-native`, `react-native-webview`, `react-native-inappbrowser-reborn`

### React Native setup

Install the peer dependencies in your app and run the native build steps:

```bash
npm install react-native-inappbrowser-reborn react-native-webview
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
  debug: true,
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

  const { pay, isProcessing, isSelecting, response, error, selectProcessor, cancelSelection } =
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
  debug: true,
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

  const { pay, isProcessing, isSelecting, response, error, CheckoutView, selectProcessor, cancelSelection, activeProcessorId } =
    usePayment(request);
  const { processors } = usePaymentProcessors();

  return (
    <View>
      <Button title={isProcessing ? 'Processing...' : 'Pay'} onPress={pay} disabled={isProcessing} />
      {error && <Text>Error: {error.message}</Text>}
      {response && <Text>Status: {response.status}</Text>}
      {CheckoutView}
      <PaymentProcessorSelector
        open={isSelecting || isProcessing}
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
      activeProcessorId,
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
          open={isSelecting || isProcessing}
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

### Keeping the selector open during initialization

When a user selects a processor, the SDK enters a `processor_selected` state while it fetches the checkout URL from your backend. During this time:

- `isSelecting` stays `true` so the selector remains visible.
- `isProcessing` becomes `true` so the selected processor shows a loading indicator.

Use `open={isSelecting || isProcessing}` on `PaymentProcessorSelector` so the modal stays open until the checkout WebView is ready to take over.

### Custom selector row with `renderItem`

You can keep the SDK's modal and backdrop while customizing only the processor row:

```tsx
<PaymentProcessorSelector
  open={isSelecting || isProcessing}
  processors={processors}
  onSelect={selectProcessor}
  onCancel={cancelSelection}
  isProcessing={isProcessing}
  activeProcessorId={activeProcessorId}
  activityIndicatorColor="#007AFF"
  presentation="fullscreen"
  backgroundColor="blue"
  renderItem={({ processor, onSelect, isLoading }) => (
    <TouchableOpacity onPress={onSelect} disabled={isLoading}>
      <Text style={{ opacity: isLoading ? 0.6 : 1 }}>
        {processor.type.toUpperCase()}
      </Text>
      {isLoading && <ActivityIndicator color="#007AFF" />}
    </TouchableOpacity>
  )}
/>
```

### Fully custom selector

If you build your own selector component, pass `activeProcessorId` and `isProcessing` to it so it can show the loading state:

```tsx
{isSelecting && (
  <CustomProcessorSelector
    processors={processors}
    onSelect={selectProcessor}
    onCancel={cancelSelection}
    activeProcessorId={activeProcessorId}
    isProcessing={isProcessing}
  />
)}
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
| `activeProcessorId` | `string \| undefined` | The processor currently being initialized/used. |
| `response` | `PaymentResponse \| undefined` | Final payment response after completion. |
| `error` | `Error \| null` | Last error, if any. |
| `CheckoutView` | `React.ReactNode` | Render this to show the checkout WebView. |
| `reset` | `() => void` | Resets the payment state. |
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

Your backend should call `POST https://api.flutterwave.com/v3/payments` to create the payment and return `{ checkoutUrl: data.data.link }`. Flutterwave expects the amount in the currency's major unit (e.g. NGN Naira, not kobo), so convert from minor units if needed.

After payment, Flutterwave redirects to `redirect_url` with `status`, `tx_ref`, and `transaction_id`. The SDK parses these into a `PaymentResponse`. If `verify` is configured, use `response.processorReference` (the Flutterwave `transaction_id`) to verify server-to-server via `GET https://api.flutterwave.com/v3/transactions/{transaction_id}/verify`.

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

The `verify` callback is optional for Paystack and Flutterwave. If you do not provide it, the SDK trusts the status returned in the processor callback URL.

For **Interswitch in React Native, `verify` is required**. Interswitch only returns a transaction reference in the WebView redirect and explicitly recommends requerying their verification endpoint before concluding that a payment was successful.

### No verification

```ts
const config = {
  processors: [...],
  // No verify callback. The SDK uses the processor callback status.
};
```

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

1. The user completes payment in a popup (web), WebView (React Native Paystack/Flutterwave), or browser (React Native Interswitch).
2. The package parses the callback URL into a `PaymentResponse` (WebView/popup) or reports `pending` (Interswitch browser).
3. If `verify` is configured, the package calls it and waits for `{ verified: true }` before returning `success`.
4. If `verify` returns `{ verified: false }`, the package returns `status: 'failed'` with the verification message.
5. For Interswitch in React Native without `verify`, closing the browser returns `status: 'cancelled'` because the SDK cannot confirm the outcome.

## Callback URL matching

The `callbackUrl` you set in `ProcessorConfig` must match the callback URL configured on your backend/processor. The SDK watches the checkout WebView/popup for navigation to this URL.

| Processor | Who sets the callback URL | Where to configure |
|-----------|---------------------------|-------------------|
| Paystack | Your backend | Set in backend and pass the same value to `ProcessorConfig.callbackUrl`. |
| Flutterwave | Your backend | Set in backend and pass the same value to `ProcessorConfig.callbackUrl`. |
| Interswitch (WebView/popup) | Your backend or client | Set `ProcessorConfig.callbackUrl` to the same URL passed as `site_redirect_url`. |
| Interswitch (React Native browser) | Client | Set `ProcessorConfig.callbackUrl` to the URL Interswitch should redirect to after payment. The SDK uses it to detect completion inside the browser session. |

If the URLs do not match, the SDK will not detect the payment completion.

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
```

## License

MIT
