# @conitepay/core

> **You do not need to install this package directly.** It is the engine that powers `@conitepay/react` (web) and `@conitepay/react-native` (React Native). Both user-facing packages include it as a dependency. Install `@conitepay/core` directly only if you are building a custom binding.

Shared types, adapters, context, and reducer for the ConitePay payment gateway. It abstracts Paystack, Flutterwave, and Interswitch behind a single `pay()` API.

It delegates all processor API calls to your own backend through `initialize` and `verify` callbacks, so secret keys never ship in the client.

For full usage documentation covering React web and React Native, see the [main ConitePay repo](https://github.com/YhoungBrown/payment-gateway).

## Peer dependencies

- `react` >= 18.0.0

## Features

- Single `pay()` entry point.
- Default processor is launched automatically.
- No default processor? A selector UI is shown.
- Backend `initialize` and `verify` callbacks keep secrets server-side.
- Tested adapters: Paystack, Flutterwave, Interswitch.

## Core API

This package provides the `PaymentGatewayProvider`, the `usePaymentContext` hook, and the processor adapters that power the React and React Native bindings. The adapters handle three checkout flows:

| Processor   | Initialization         | Callback format                      |
|-------------|------------------------|--------------------------------------|
| Paystack    | Backend (initialize)   | `reference` query param              |
| Flutterwave | Backend (initialize)   | `status`, `tx_ref`, `transaction_id` |
| Interswitch | Client-side POST form  | `txnref` query param                 |

## Provider setup

```tsx
import {
  PaymentGatewayProvider,
  usePaymentContext,
} from '@conitepay/core';

const config = {
  processors: [
    {
      id: 'paystack-1',
      type: 'paystack' as const,
      callbackUrl: 'https://yourapp.com/callback',
      isDefault: true,
    },
  ],
  initialize: async (request, processor) => {
    const res = await fetch('/api/payments/initialize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request, processor: processor.type }),
    });
    const { checkoutUrl } = await res.json();
    return { checkoutUrl };
  },
  verify: async (response) => {
    const res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(response),
    });
    return res.json(); // { verified: boolean, message?: string }
  },
};

function App() {
  return (
    <PaymentGatewayProvider config={config}>
      {/* Your checkout UI uses usePaymentContext() here */}
    </PaymentGatewayProvider>
  );
}
```

`isDefault` is optional. Add it to a processor only when you want that processor to launch automatically when `pay()` is called. If no processor has `isDefault: true`, the SDK shows the selector UI.

## Amount format

All amounts are in **minor units** (kobo for NGN, cents for USD, etc.). The SDK uses `amount` directly when building a client-side checkout form (Interswitch).

For processors that require server-side initialization, it is your backend's responsibility to convert if the processor expects major units.

| Processor    | Expects      | Backend should send                                 |
|--------------|-------------|-----------------------------------------------------|
| Paystack     | Minor units | `request.amount` as is (e.g. `10000` = ₦100.00)     |
| Flutterwave  | Major units | `request.amount / 100` (e.g. `100` = ₦100.00)       |
| Interswitch  | Minor units | SDK builds the form client-side and sends `request.amount` as is |

## Verification

The `verify` callback is **required**. The SDK calls `verify` after the checkout WebView or popup closes. If it returns `{ verified: true }`, the SDK reports `success`. If it returns `{ verified: false }`, the SDK reports `failed`.

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
    { id: 'paystack-1', type: 'paystack' as const, callbackUrl: 'https://yourapp.com/callback', isDefault: true },
    { id: 'flutterwave-1', type: 'flutterwave' as const, callbackUrl: 'https://yourapp.com/callback' },
    { id: 'interswitch-1', type: 'interswitch' as const, callbackUrl: 'https://yourapp.com/payment-response', endpoint: 'https://...', merchantCode: '...', payItemId: '...' },
  ],
  verify: async (response) => {
    switch (response.processor) {
      case 'paystack':
        return verifyOnBackend('/api/payments/verify/paystack', response.reference);
      case 'flutterwave':
        return verifyOnBackend('/api/payments/verify/flutterwave', response.processorReference);
      case 'interswitch':
        return verifyOnBackend('/api/payments/verify/interswitch', response.reference);
      default:
        return { verified: false, message: 'Verification not configured for this processor' };
    }
  },
};
```

## Flutterwave Standard checkout

Your backend should call `POST https://api.flutterwave.com/v3/payments` to create the payment and return `{ checkoutUrl: data.data.link }`. Flutterwave expects the amount in the currency's major unit (e.g. NGN Naira, not kobo).

After payment, Flutterwave redirects to your callback with `status`, `tx_ref`, and `transaction_id`. The SDK parses these into a `PaymentResponse`. Use `response.processorReference` (the Flutterwave `transaction_id`) in your `verify` callback to confirm the payment server to server via `GET https://api.flutterwave.com/v3/transactions/{transaction_id}/verify`.

## Interswitch Web Checkout

The Interswitch adapter builds a client-side POST form. You must obtain the checkout endpoint, `merchantCode`, and `payItemId` from your Interswitch account.

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

## Metadata

You can attach arbitrary business data to a payment via the `metadata` field on `PaymentRequest`:

```ts
const request = {
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

## License

MIT