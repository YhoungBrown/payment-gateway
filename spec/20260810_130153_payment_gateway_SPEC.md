# Feature Spec: Universal Payment Gateway Package

| Field | Value |
|---|---|
| Spec ID | `PAY-GW-UNIVERSAL` |
| Version | `0.4` |
| Author (senior/owner) | `<placeholder>` |
| Implementer | `TBD` |
| Status | `DONE` |
| Target repo / service | `C:\Projects\PaymentGateway` |
| Skills to load | `spec-authoring` |
| Domain reference | `references/frontend.md`, `references/react-native.md` |
| Standing rules | Greenfield repo. Proposed stack: TypeScript, monorepo (npm/pnpm workspaces), `tsup`, React Context + reducer, headless core + optional default UI, WebView redirect flow on React Native, Playwright for web E2E. |

## 0. TL;DR

Build a TypeScript monorepo payment package (`@org/payment-gateway`) with a single `pay()` API for React and React Native. If a default processor exists, `pay()` launches it immediately; otherwise it opens a processor selector. Consumers may use the package's default selector UI or build a fully custom one using the exposed hooks. All processors load via checkout URL (popup on web, WebView on native). Backend `initialize` and `verify` callbacks let merchants keep secrets server-side and confirm transactions before value is delivered.

## 1. Context & why now

Merchants integrate each processor separately, duplicating checkout orchestration and response handling. A single gateway lets merchants offer Paystack, Flutterwave, and Interswitch from one configuration, while users either pay through a configured default or choose at checkout.

## 2. Scope

**In scope**
- Monorepo with shared core, React package, and React Native package.
- Single `pay()` entry point with default-first behavior and fallback selector.
- Processor adapters for Paystack, Flutterwave, and Interswitch that launch checkout URLs.
- Optional default `PaymentProcessorSelector` UI inside each platform package.
- Headless hooks (`usePayment`, `usePaymentProcessors`) for fully custom UI.
- Unified request/response types and normalized status handling.
- Optional merchant `initialize` and `verify` callbacks for backend transaction initialization and verification.
- React web popup/redirect checkout and React Native WebView checkout.
- Debug-mode logging only.

**Explicitly out of scope**
- Bundling processor SDKs or native modules.
- Server-side Interswitch/Paystack/Flutterwave API clients.
- Refund, chargeback, subscription, or payout flows.
- On-device persistence of transaction history.
- Merchant onboarding UI.
- Example app inside the SDK repo (`smartpayfresh` is the external test app).
- Step 10 migration/rollout section.

## 3. Requirements — acceptance criteria (EARS)

- R1. WHEN a merchant wraps their app in `PaymentGatewayProvider` with a list of configured processors, THEN the system SHALL expose `usePayment` and `usePaymentProcessors` to descendant components.
- R2. WHEN the consumer invokes `pay()` and a default processor is configured, THEN the system SHALL initiate payment through that default processor without showing the selector.
- R3. WHEN the consumer invokes `pay()` and no default processor is configured, THEN the system SHALL set `isSelecting: true` and expose every configured processor to the UI.
- R4. WHEN the user selects a processor from the selector, THEN the system SHALL initiate payment through that processor.
- R5. WHEN the user dismisses the selector without selecting a processor, THEN the system SHALL return a `PaymentResponse` with `status: 'cancelled'`.
- R6. WHEN a processor reports a successful payment, THEN the system SHALL return a `PaymentResponse` with `status: 'success'`, the original reference, and the processor transaction reference.
- R7. WHEN a processor reports a failure, THEN the system SHALL return a `PaymentResponse` with `status: 'failed'` and a human-readable message.
- R8. WHEN the user cancels the checkout flow, THEN the system SHALL return a `PaymentResponse` with `status: 'cancelled'`.
- R9. IF no processors are configured, THEN `usePayment` SHALL return an error state indicating missing configuration.
- R10. IF more than one processor is marked `isDefault: true`, THEN the provider SHALL throw at initialization with a `DuplicateDefaultProcessorError`.
- R11. IF the provider is configured with a `verify` callback and the processor reports success, THEN the system SHALL call `verify` and return the final response only after verification completes.
- R12. IF `verify` returns `verified: false`, THEN the system SHALL return a `PaymentResponse` with `status: 'failed'` and the verification message.
- R13. WHERE the runtime is React web, THEN the system SHALL open the processor checkout URL in a popup by default, with full-page redirect as a configurable fallback.
- R14. WHERE the runtime is React Native, THEN the system SHALL open the processor checkout URL in a WebView.
- R15. IF the checkout URL cannot be initialized, THEN the system SHALL surface the error through the hook error state and SHALL NOT crash.
- R16. The system SHALL represent all amounts as minor-unit integers and all currency codes as ISO 4217 strings.
- R17. IF `debug: true` is set on the provider, THEN the system SHALL log initialization, adapter actions, URL parsing, and verification steps; IF `debug` is false or unset, THEN the system SHALL emit no logs.

## 4. Design — how to build it

### 4a. LOCKED decisions — implement exactly, do NOT deviate

- L1. Amounts SHALL be integers in minor units; currency SHALL be ISO 4217; no float arithmetic for money.
- L2. Public API surface SHALL include at minimum: `PaymentGatewayProvider`, `usePayment`, `usePaymentProcessors`, and `PaymentProcessorSelector`.
- L3. Supported processor types are locked to `paystack`, `flutterwave`, and `interswitch`.
- L4. Processor credentials/config SHALL be supplied by the merchant at provider initialization; no secrets SHALL be hardcoded in package source.
- L5. `PaymentResponse` SHALL have the same fields for every processor: `{ status, reference, processor, processorReference?, message? }`.
- L6. Exactly one processor per gateway instance may have `isDefault: true`.
- L7. `pay()` is the only imperative payment method exposed by `usePayment`.
- L8. If a default processor exists, `pay()` SHALL NOT show the selector; it SHALL launch that processor directly.
- L9. If no default processor exists, `pay()` SHALL set `isSelecting: true` and wait for `selectProcessor(id)` or `cancelSelection()`.
- L10. On React Native, every processor checkout SHALL be rendered via `react-native-webview` loading the checkout URL.
- L11. On React web, every processor checkout SHALL be rendered via popup by default; redirect is an opt-in config.
- L12. The package SHALL parse the callback URL itself by matching the configured `callbackUrl` and extracting query parameters.
- L13. If a `verify` callback is provided, the hook SHALL NOT return `success` until `verify` resolves `verified: true`.
- L14. Every processor adapter SHALL normalize both request input and response output to the unified contracts in section 4c.
- L15. Debug logs SHALL be controlled solely by the `debug` provider flag and SHALL never log secrets, full checkout URLs with tokens, or sensitive user data.
- L16. The default `PaymentProcessorSelector` SHALL be a presentational component only; all selection logic lives in the headless hook API.
- L17. If a web popup is blocked, the package SHALL silently fall back to full-page redirect.
- L18. Flutterwave integration SHALL target the v3 Standard flow (`/v3/payments` checkout link).

### 4b. OPEN decisions — implementer/Claude MAY propose (now resolved)

- O1. **Package layout** → **monorepo** with `@org/payment-gateway-core`, `@org/payment-gateway-react`, `@org/payment-gateway-react-native`.
- O2. **React Native checkout strategy** → **WebView** for all processors.
- O3. **Internal state management** → **React Context + `useReducer`**, self-contained.
- O4. **Selector component pattern** → **headless core** with an optional styled default component inside each platform package.
- O5. **Build tool** → **tsup**.
- O6. **React Native E2E tooling** → Playwright for web E2E + checkout URL security tests; React Native app tested with Jest/RNTL and Detox/Appium.
- O7. **Flutterwave version** → v3 Standard.
- O8. **Web popup fallback** → silently fall back to full redirect if blocked.

### 4c. VERBATIM artifacts — copy exactly, do not paraphrase

```typescript
// Processor types
type ProcessorType = 'paystack' | 'flutterwave' | 'interswitch';

// Verification result returned by merchant backend
interface VerificationResult {
  verified: boolean;
  message?: string;
  data?: unknown;
}

// Unified processor configuration
interface ProcessorConfig {
  id: string;
  type: ProcessorType;
  isDefault?: boolean;
  publicKey?: string;    // Optional for backend-driven processors (Paystack, Flutterwave)
  callbackUrl: string;
  cancelUrl?: string;
  endpoint?: string;     // Checkout endpoint, required for Interswitch client-side mode
  // Split payment options — provider-specific
  subaccount?: string;   // Paystack subaccount code, e.g. "ACCT_xxxxxxxx"
  splitCode?: string;    // Flutterwave split code / subaccounts identifier
  // Interswitch-specific
  merchantCode?: string; // Interswitch merchant_code
  payItemId?: string;    // Interswitch pay_item_id
  payItemName?: string;  // Interswitch pay_item_name (optional)
}

// Payment request
interface PaymentRequest {
  amount: number;        // minor units, integer, e.g. 10000 for NGN 100.00
  currency: string;      // ISO 4217, e.g. "NGN"
  reference: string;     // merchant-generated unique reference
  email: string;
  metadata?: Record<string, unknown>;
}

// Example metadata payload
const exampleMetadata = {
  orderId: "ORD-12345",
  customerId: "CUST-98765",
  cartItems: [
    { productId: "P001", name: "Premium Plan", quantity: 1, unitPrice: 10000 },
    { productId: "P002", name: "Add-on", quantity: 2, unitPrice: 2500 }
  ],
  customFields: [
    { display_name: "Plan Type", variable_name: "plan_type", value: "annual" },
    { display_name: "Region", variable_name: "region", value: "lagos" }
  ]
};

// Unified payment response
type PaymentStatus = 'success' | 'cancelled' | 'failed' | 'pending';

interface PaymentResponse {
  status: PaymentStatus;
  reference: string;            // merchant reference from request
  processor: ProcessorType;
  processorReference?: string;  // provider transaction id
  message?: string;
}

// Gateway provider configuration
interface PaymentGatewayConfig {
  processors: ProcessorConfig[];
  debug?: boolean;
  // Called when the package needs a checkout URL for a processor.
  // Required for Paystack and Flutterwave because initialization requires a secret key.
  // Optional for Interswitch, which can build a client-side POST form.
  initialize?: (
    request: PaymentRequest,
    processor: ProcessorConfig
  ) => Promise<{ checkoutUrl: string; method?: 'GET' | 'POST'; postData?: Record<string, string> }>;
  
  // Called after processor callback to verify transaction server-side.
  verify?: (response: PaymentResponse) => Promise<VerificationResult>;
}

// Hook API
interface UsePaymentResult {
  pay: () => Promise<PaymentResponse>;
  selectProcessor: (processorId: string) => Promise<PaymentResponse>;
  cancelSelection: () => void;
  isProcessing: boolean;
  isSelecting: boolean;
  error: Error | null;
  reset: () => void;
}

interface UsePaymentProcessorsResult {
  processors: ProcessorConfig[];
  defaultProcessor: ProcessorConfig | undefined;
}
```

#### How `initialize` and `verify` work

1. **Checkout initialization (`initialize`)**
   - Before opening any checkout, the package needs a checkout URL.
   - For **Paystack** and **Flutterwave**, the merchant backend must call the processor's initialize endpoint using the secret key, then return the checkout URL. The package calls `initialize(request, processor)` to get `{ checkoutUrl, method, postData }`.
   - For **Interswitch**, the adapter can build a client-side POST form because Interswitch only requires `merchant_code`, `pay_item_id`, and public fields. If `initialize` is provided, it is used instead.

2. **Callback interception**
   - The package loads `checkoutUrl` in a web popup (React) or WebView (React Native).
   - It watches the navigation URL. When the URL matches the configured `callbackUrl`, the package parses the query string and builds a `PaymentResponse`.
   - **Paystack:** The adapter reads `status` from the callback URL (`success`, `failed`, `abandoned`, `cancelled`) and maps it directly. If `status` is absent or unrecognized, the adapter returns `pending` so that an optional `verify` callback can make the final decision.
   - **Flutterwave:** The adapter reads `status` from the callback URL and maps `successful`/`success` to `success`, `cancelled`/`canceled` to `cancelled`, and `failed`/`failure` to `failed`.
   - **Interswitch:** The adapter reads `resp` from the callback URL. `00` means `success`; any other present value means `failed`; if `resp` is absent, it returns `pending` so an optional `verify` callback can decide.

3. **Backend verification (`verify`)**
   - If `verify` is configured, the package calls `verify(response)` immediately after parsing the callback.
   - The merchant backend uses the response reference to call the processor's verify endpoint.
   - The backend returns `{ verified: true, data? }` or `{ verified: false, message? }`.
   - The package does not return `status: 'success'` until `verify` resolves `verified: true`.

#### Interswitch implementation details

- **Payment URL**
  - The merchant supplies the checkout endpoint via `ProcessorConfig.endpoint`.
  - The SDK does not hardcode a sandbox or live URL.
  - If `endpoint` is missing and no `initialize` callback is provided, the adapter throws `CheckoutInitializationError`.

- **Required POST fields (client-side mode)**
  - `merchant_code` — maps to `ProcessorConfig.merchantCode`
  - `pay_item_id` — maps to `ProcessorConfig.payItemId`
  - `currency` — numeric code, e.g. `'566'` for NGN
  - `site_redirect_url` — maps to `ProcessorConfig.callbackUrl`
  - `txn_ref` — maps to `PaymentRequest.reference`
  - `amount` — maps to `PaymentRequest.amount` (already in minor units / kobo)
  - `pay_item_name` — maps to `ProcessorConfig.payItemName` (optional)
  - `cust_name`
  - `cust_id`

- **Callback**
  - Interswitch POSTs back to `site_redirect_url` with fields including `txnref`, `resp`, `desc`, `payRef`, `retRef`, `cardNum`, `amount`.

- **Verification**
  - The SDK does not perform client-side verification because CORS and security concerns make it unreliable.
  - Merchants that need server-side verification provide a `verify` callback, or omit it to rely on the callback `resp` code.

#### Build tool decision: tsup vs Vite

| Criterion | tsup | Vite (library mode) |
|---|---|---|
| Primary use case | TypeScript / Node libraries | Apps and general libraries |
| Bundler engine | esbuild (very fast) | Rollup (slower but more configurable) |
| ESM/CJS/dts output | Near zero-config | Requires explicit Rollup config for dual output |
| TypeScript declarations | Built-in `--dts` | Requires `vite-plugin-dts` |
| Monorepo fit | Lightweight per-package builds | Heavier, better when assets/CSS are involved |
| Watch/dev mode | Fast | Fast |
| Config surface | Minimal | Larger plugin ecosystem |

This package exports pure TypeScript modules, has no heavy assets or CSS bundling needs, and requires fast dual ESM/CJS builds across three monorepo packages. `tsup` is the better fit.

**Decision: use `tsup` for all library packages.**

## 5. State, data & persistence changes

Provider state shape (React Context + reducer):

```typescript
interface PaymentState {
  processors: ProcessorConfig[];
  defaultProcessor: ProcessorConfig | undefined;
  transaction: {
    status: 'idle' | 'initializing' | 'selecting' | 'processing' | 'verifying' | 'done' | 'error';
    response?: PaymentResponse;
    error?: Error;
  };
}
```

- No persisted state.
- No localStorage/AsyncStorage usage for secrets.
- Debug logs gated by `PaymentGatewayConfig.debug`.

## 6. Package & file map

```
payment-gateway/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   │   ├── types.ts
│   │   │   ├── errors.ts
│   │   │   ├── logger.ts
│   │   │   ├── context.tsx
│   │   │   ├── reducer.ts
│   │   │   ├── adapters/
│   │   │   │   ├── base.ts
│   │   │   │   ├── paystack.ts
│   │   │   │   ├── flutterwave.ts
│   │   │   │   └── interswitch.ts
│   │   │   └── utils/
│   │   │       └── money.ts
│   │   ├── package.json
│   │   └── tsup.config.ts
│   ├── react/
│   │   ├── src/
│   │   │   ├── PaymentGatewayProvider.tsx
│   │   │   ├── usePayment.ts
│   │   │   ├── usePaymentProcessors.ts
│   │   │   ├── PaymentProcessorSelector.tsx
│   │   │   ├── components/
│   │   │   │   └── DefaultProcessorItem.tsx
│   │   │   └── checkout/
│   │   │       └── CheckoutPopup.tsx
│   │   ├── package.json
│   │   └── tsup.config.ts
│   ├── react-native/
│   │   ├── src/
│   │   │   ├── PaymentGatewayProvider.tsx
│   │   │   ├── usePayment.ts
│   │   │   ├── usePaymentProcessors.ts
│   │   │   ├── PaymentProcessorSelector.tsx
│   │   │   ├── components/
│   │   │   │   └── DefaultProcessorItem.tsx
│   │   │   └── checkout/
│   │   │       └── CheckoutWebView.tsx
│   │   ├── package.json
│   │   └── tsup.config.ts
├── package.json          (workspaces root)
├── turbo.json
├── playwright.config.ts
├── jest.config.js        (or vitest.config.ts for core/react)
└── README.md
```

No example app inside the SDK repo. The `smartpayfresh` app is the external integration/QA target.

## 7. Tasks — ordered execution plan

1. Scaffold monorepo with workspaces, `tsup`, TypeScript, and shared config.
2. Implement `packages/core` types, errors, logger, context, reducer, and base adapter contract.
3. Implement Paystack, Flutterwave, and Interswitch adapters (URL/callback normalization only).
4. Implement `packages/react` provider, `usePayment`, `usePaymentProcessors`, default selector, and popup checkout.
5. Implement `packages/react-native` provider, `usePayment`, `usePaymentProcessors`, default selector, and WebView checkout.
6. Add backend `initialize`/`verify` wiring and callback URL parsing.
7. Write unit tests for adapters, hooks, and reducer.
8. Write Playwright web E2E tests.
9. Write React Native tests with mocked WebView.
10. Build all packages for ESM/CJS and verify no cross-platform SDK leakage.
11. Verify integration against the `smartpayfresh` app.

## 8. Test plan — named tests

- `should expose configured processors and default through usePaymentProcessors` → R1
- `should initiate default processor immediately when pay() is called with a default configured` → R2
- `should set isSelecting when pay() is called without a default` → R3
- `should initiate selected processor when selectProcessor is called` → R4
- `should return cancelled status when cancelSelection is called` → R5
- `should return success response when processor callback indicates success` → R6
- `should return failed response when processor callback indicates failure` → R7
- `should return cancelled response when user cancels checkout` → R8
- `should return missing configuration error when no processors are supplied` → R9
- `should throw DuplicateDefaultProcessorError when multiple defaults are configured` → R10
- `should call verify callback before returning success` → R11
- `should return failed response when verify returns verified: false` → R12
- `should open popup on web checkout by default` → R13
- `should open WebView on React Native checkout` → R14
- `should surface initialization error without crashing` → R15
- `should reject non-integer amounts and invalid currency codes` → R16
- `should log only when debug flag is true` → R17

## 9. Verification checklist — implementer self-checks before raising PR

- [ ] All section 3 acceptance criteria have a passing named test from section 8.
- [ ] Every section 4a LOCKED decision implemented as written.
- [ ] Every section 4b OPEN decision confirmed with the author/owner, or explicit "yolo"/"one time" received.
- [ ] Every section 4c VERBATIM artifact copied exactly.
- [ ] No secrets or public keys hardcoded in source.
- [ ] Money handled as minor-unit integers; no float arithmetic.
- [ ] Package builds for both ESM and CJS without warnings.
- [ ] React and React Native entry points do not pull in the opposite platform's SDKs.
- [ ] README usage examples cover all three processors and both platforms.
- [ ] Playwright web E2E tests pass.
- [ ] React Native unit tests with mocked WebView pass.
- [ ] Backend `initialize` and `verify` callbacks are documented with examples.
- [ ] Debug logs never emit in production/default mode.

## 10. Migration, rollout & rollback

*Skipped per user request.*

## 11. Open questions for the author

*All questions resolved in version 0.4.*
