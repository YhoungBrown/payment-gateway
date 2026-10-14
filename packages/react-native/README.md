# @conitepay/react-native

> **Full docs and examples:** [github.com/YhoungBrown/payment-gateway](https://github.com/YhoungBrown/payment-gateway)

React Native bindings for the ConitePay payment gateway. Opens checkout in a WebView. It abstracts Paystack, Flutterwave, and Interswitch behind a single `pay()` API.

It delegates all processor API calls to your own backend through `initialize` and `verify` callbacks, so secret keys never ship in the client.

> **Building for the web?** Install `@conitepay/react` instead. The concepts and config are the same across both packages.

## Installation

```bash
npm install @conitepay/react-native react-native-webview
```

For iOS, run `npx pod-install` after installing.

## Peer dependencies

- `react` >= 18.0.0
- `react-native` >= 0.72.0
- `react-native-webview` >= 13.0.0

These are peer dependencies, not bundled dependencies. Bundling them would create duplicate native modules and build failures.

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
} from '@conitepay/react-native';
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

`isDefault` is optional. Add it to a processor only when you want that processor to launch automatically when `pay()` is called. If no processor has `isDefault: true`, the SDK shows the selector UI.

## Class components

Hooks can only be used inside function components. If your screen is a class component, wrap it with `withPaymentGateway` instead.

`withPaymentGateway` is a higher order component that injects the same values returned by `usePayment` and `usePaymentProcessors` as props.

```tsx
import React, { Component } from 'react';
import { View, Button, Text } from 'react-native';
import {
  PaymentGatewayProvider,
  withPaymentGateway,
  PaymentProcessorSelector,
  type WithPaymentGatewayProps,
} from '@conitepay/react-native';

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
          //presentation="fullscreen"   // Uncomment to show the selector as a full-screen modal
          //backgroundColor="blue"      // Uncomment to change the background color of the selector modal
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
| `isProcessing` | `boolean` | True while initializing, processor selection, processing, or verifying. |
| `isSelecting` | `boolean` | True when the user needs to pick a processor or while the selected processor is initializing. |
| `showProcessorSelector` | `boolean` | Ready to use visibility flag for `PaymentProcessorSelector.open` and custom selectors. |
| `activeProcessorId` | `string \| undefined` | The processor currently being initialized/used. |
| `response` | `PaymentResponse \| undefined` | Final payment response after completion. |
| `error` | `Error \| null` | Last error, if any. |
| `CheckoutView` | `React.ReactNode` | Render this to show the checkout WebView. |
| `reset` | `() => void` | Resets the payment state. |
| `failedProcessorIds` | `string[]` | IDs of processors that have failed. These are disabled for the current payment attempt. |
| `timedOutProcessorIds` | `string[]` | IDs of processors whose initialization timed out. Unlike failed processors, these can be retried. |
| `processors` | `ProcessorConfig[]` | All configured processors. |
| `defaultProcessor` | `ProcessorConfig \| undefined` | The processor marked as default, if any. |

The wrapped component must receive a `request` prop of type `PaymentRequest`.

## Keeping the selector open during initialization

After a user selects a processor, the selector should remain visible with that processor's loading indicator while the checkout is being prepared. Once the checkout WebView is ready, the selector closes so the WebView can take over.

The SDK provides `showProcessorSelector` directly from `usePayment` (and from `withPaymentGateway`). It handles the selector visibility correctly for both manual selection and default processor flows:

```tsx
const { showProcessorSelector } = usePayment(request);

<PaymentProcessorSelector
  open={showProcessorSelector}
  // ...
/>
```

This keeps the selector open during manual selection and initialization, including the short transition before the WebView is mounted, while keeping it hidden during automatic default processor initialization and during the redirect/verification phase after the WebView closes.

If building a custom selector UI, use `showProcessorSelector` for visibility and `isProcessing` plus `activeProcessorId` to show the selected processor's loading state.

## Custom selector row with `renderItem`

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
        {isFailed && !isTimedOut && ' Unavailable'}
        {isTimedOut && ' Timed out'}
      </Text>
      {isLoading && <ActivityIndicator color="#007AFF" />}
    </TouchableOpacity>
  )}
/>
```

## Fully custom selector

If you build your own selector component, use `showProcessorSelector` for visibility and `isProcessing` / `activeProcessorId` to show the loading state. If your component is a Modal, pass `visible={showProcessorSelector}` instead of conditionally rendering it:

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

## Amount format

All amounts are in **minor units** (kobo for NGN, cents for USD, etc.).

| Processor    | Expects      | Backend should send                                 |
|--------------|-------------|-----------------------------------------------------|
| Paystack     | Minor units | `request.amount` as is (e.g. `10000` = ₦100.00)     |
| Flutterwave  | Major units | `request.amount / 100` (e.g. `100` = ₦100.00)       |
| Interswitch  | Minor units | SDK builds the form client-side and sends `request.amount` as is |

## Verification

The `verify` callback is **required**. The SDK calls `verify` after the checkout WebView closes. If it returns `{ verified: true }`, the SDK reports `success`. If it returns `{ verified: false }`, the SDK reports `failed`.

```ts
// Single processor
const config = {
  processors: [{ id: 'paystack-1', type: 'paystack' as const, callbackUrl: 'https://yourapp.com/callback', isDefault: true }],
  verify: async (response) => {
    const res = await fetch('https://yourapi.com/verify', {
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

The fallback and timeout lists clear when the user starts a new payment (for example, by tapping Pay again).

## Interswitch WebView checkout

In React Native, all processors open inside a WebView. The Interswitch adapter builds a client-side POST form and submits it directly in the WebView.

```ts
{
  id: 'interswitch-1',
  type: 'interswitch' as const,
  callbackUrl: 'https://yourapp.com/payment-response',
  endpoint: 'https://<interswitch-checkout-host>/collections/w/pay',
  merchantCode: 'YOUR_MERCHANT_CODE',
  payItemId: 'YOUR_PAY_ITEM_ID',
  payItemName: 'Your Product Name', // optional
}
```

Do not hardcode Interswitch URLs in your SDK config. Use the endpoint provided by Interswitch for your environment (sandbox or production).

## Web usage

If you are building for the web, install `@conitepay/react` instead:

```bash
npm install @conitepay/react
```

The concepts and config are identical. The key differences are:

- Checkout opens in a popup window instead of a WebView.
- Use `isSelecting` (not `showProcessorSelector`) to control selector visibility.
- There is no `CheckoutView` node — the popup handles the checkout UI.
- There is no loading phase on the selector; the popup opens immediately after selecting a processor.

```tsx
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
  PaymentProcessorSelector,
} from '@conitepay/react';

function Checkout() {
  const request = {
    amount: 10000, // minor units
    currency: 'NGN',
    reference: 'ORDER-123',
    email: 'customer@example.com',
  };

  const { pay, isProcessing, isSelecting, response, error, selectProcessor, cancelSelection, failedProcessorIds, timedOutProcessorIds } =
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
        timedOutProcessorIds={timedOutProcessorIds}
      />
    </div>
  );
}
```

See the [`@conitepay/react` README](https://www.npmjs.com/package/@conitepay/react) for callback URL same-origin requirements and fully custom selector examples.

## License

MIT