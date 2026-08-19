# @org/payment-gateway

A TypeScript monorepo payment package for React and React Native. It abstracts Paystack, Flutterwave, and Interswitch Webpay behind a single `pay()` API.

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
- React Native: `react`, `react-native`, `react-native-webview`

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

  const { pay, isProcessing, isSelecting, response, error, CheckoutView, selectProcessor, cancelSelection } =
    usePayment(request);
  const { processors } = usePaymentProcessors();

  return (
    <View>
      <Button title={isProcessing ? 'Processing...' : 'Pay'} onPress={pay} disabled={isProcessing} />
      {error && <Text>Error: {error.message}</Text>}
      {response && <Text>Status: {response.status}</Text>}
      {CheckoutView}
      <PaymentProcessorSelector
        open={isSelecting}
        processors={processors}
        onSelect={selectProcessor}
        onCancel={cancelSelection}
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
          open={isSelecting}
          processors={processors}
          onSelect={selectProcessor}
          onCancel={cancelSelection}
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

### Injected props

`withPaymentGateway` injects everything from `usePayment` and `usePaymentProcessors`:

| Prop | Type | Description |
|------|------|-------------|
| `pay` | `() => Promise<PaymentResponse>` | Starts the payment flow. |
| `selectProcessor` | `(processorId: string) => Promise<PaymentResponse>` | Selects a processor when no default is set. |
| `cancelSelection` | `() => void` | Cancels the processor selector. |
| `isProcessing` | `boolean` | True while initializing, processing, or verifying. |
| `isSelecting` | `boolean` | True when the user needs to pick a processor. |
| `response` | `PaymentResponse \| undefined` | Final payment response after completion. |
| `error` | `Error \| null` | Last error, if any. |
| `CheckoutView` | `React.ReactNode` | Render this to show the checkout WebView. |
| `reset` | `() => void` | Resets the payment state. |
| `processors` | `ProcessorConfig[]` | All configured processors. |
| `defaultProcessor` | `ProcessorConfig \| undefined` | The processor marked as default, if any. |

The wrapped component must receive a `request` prop of type `PaymentRequest`.

## Interswitch Webpay client-side checkout

Webpay can be initialized client-side when you supply the checkout endpoint, product ID, pay item ID, and MAC key. This is useful for backend-free integrations or sandbox testing.

```ts
const config = {
  processors: [
    {
      id: 'webpay-1',
      type: 'webpay' as const,
      callbackUrl: 'https://yourapp.com/callback',
      endpoint: 'https://your-webpay-endpoint.com/webpay/pay',
      productId: 'YOUR_PRODUCT_ID',
      payItemId: 'YOUR_PAY_ITEM_ID',
      macKey: 'YOUR_MAC_KEY',
    },
  ],
};
```

For production, consider moving the MAC key to your backend and using the `initialize` callback instead.

## Verification

The `verify` callback is optional. If you do not provide it, the SDK trusts the status returned in the processor callback URL.

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
      id: 'webpay-1',
      type: 'webpay' as const,
      callbackUrl: 'https://yourapp.com/callback',
      endpoint: 'https://your-webpay-endpoint.com/webpay/pay',
      productId: 'YOUR_PRODUCT_ID',
      payItemId: 'YOUR_PAY_ITEM_ID',
      macKey: 'YOUR_MAC_KEY',
    },
  ],
  verify: async (response) => {
    switch (response.processor) {
      case 'paystack':
        return verifyOnBackend('/api/payments/verify/paystack', response.reference);
      case 'flutterwave':
        return verifyOnBackend('/api/payments/verify/flutterwave', response.processorReference);
      case 'webpay':
        return verifyOnBackend('/api/payments/verify/webpay', response.reference);
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
3. If `verify` is configured, the package calls it and waits for `{ verified: true }` before returning `success`.
4. If `verify` returns `{ verified: false }`, the package returns `status: 'failed'` with the verification message.

## Callback URL matching

The `callbackUrl` you set in `ProcessorConfig` must match the callback URL configured on your backend/processor. The SDK watches the checkout WebView/popup for navigation to this URL.

| Processor | Who sets the callback URL | Where to configure |
|-----------|---------------------------|-------------------|
| Paystack | Your backend | Set in backend and pass the same value to `ProcessorConfig.callbackUrl`. |
| Flutterwave | Your backend | Set in backend and pass the same value to `ProcessorConfig.callbackUrl`. |
| Webpay | Your backend or client | Set `ProcessorConfig.callbackUrl` to the same URL passed as `site_redirect_url`. |

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
