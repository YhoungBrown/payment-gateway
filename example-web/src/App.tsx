/**
 * SmartPay Web — example app for @conitepay/react.
 * It uses Paystack, Flutterwave, and Interswitch in the browser.
 * It uses same-origin paths that Vercel rewrites to the demo backend.
 * To use another backend, update the rewrite destinations in vercel.json.
 */

import { useEffect, useState } from 'react';
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
  PaymentProcessorSelector,
  type PaymentGatewayConfig,
  type PaymentRequest,
  type PaymentResponse,
} from '@conitepay/react';
import './App.css';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Interswitch Web Checkout sandbox credentials (client-side form fields).
// Get these from your Interswitch dashboard and set them in your .env file.
// See .env for the required variables.
const INTERSWITCH_ENDPOINT =
  import.meta.env.VITE_INTERSWITCH_ENDPOINT || 'https://sandbox.interswitchng.com/collections/w/pay';
const INTERSWITCH_MERCHANT_CODE =
  import.meta.env.VITE_INTERSWITCH_MERCHANT_CODE || 'get_your_interswitch_merchant_code';
const INTERSWITCH_PAY_ITEM_ID =
  import.meta.env.VITE_INTERSWITCH_PAY_ITEM_ID || 'get_your_interswitch_pay_item_id';
const INTERSWITCH_PAY_ITEM_NAME =
  import.meta.env.VITE_INTERSWITCH_PAY_ITEM_NAME || 'Your Product Name';

// Use absolute callback URLs on this app's origin. Vercel proxies these paths
// to the demo backend, while the browser continues to see the app's origin so
// the SDK can detect the popup callback.
const PAYSTACK_CALLBACK_URL = `${window.location.origin}/callback`;
const FLUTTERWAVE_CALLBACK_URL = `${window.location.origin}/flutterwave-callback`;
const INTERSWITCH_REDIRECT_URL = `${window.location.origin}/payment-response`;

function buildConfig(): PaymentGatewayConfig {
  return {
    // Remove `debug: true` in production — it enables verbose logging for development only.
    debug: true,
    processors: [
      {
        id: 'paystack-test',
        type: 'paystack',
        callbackUrl: PAYSTACK_CALLBACK_URL,
      },
      {
        id: 'flutterwave-test',
        type: 'flutterwave',
        callbackUrl: FLUTTERWAVE_CALLBACK_URL,
      },
      {
        id: 'interswitch-sandbox',
        type: 'interswitch',
        callbackUrl: INTERSWITCH_REDIRECT_URL,
        endpoint: INTERSWITCH_ENDPOINT,
        merchantCode: INTERSWITCH_MERCHANT_CODE,
        payItemId: INTERSWITCH_PAY_ITEM_ID,
        payItemName: INTERSWITCH_PAY_ITEM_NAME,
      },
    ],
    initialize: async (request, processor) => {
      if (processor.type !== 'paystack' && processor.type !== 'flutterwave') {
        // Return undefined so the SDK falls back to client-side initialization
        // (Interswitch POST form is submitted directly in the popup).
        return undefined;
      }

      const res = await fetch('/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, processor }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Backend error: ${res.status}`);
      }

      const data = await res.json();
      console.log(`${processor.type} initialization response:`, data);
      return { checkoutUrl: data.checkoutUrl };
    },
    verify: async (response) => {
      if (response.processor === 'paystack') {
        const res = await fetch('/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            verified: false,
            message: err.error || `Backend error: ${res.status}`,
          };
        }

        return res.json();
      }

      if (response.processor === 'flutterwave') {
        const res = await fetch('/verify-flutterwave', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            verified: false,
            message: err.error || `Backend error: ${res.status}`,
          };
        }

        return res.json();
      }

      if (response.processor === 'interswitch') {
        const res = await fetch('/verify-interswitch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            verified: false,
            message: err.error || `Backend error: ${res.status}`,
          };
        }

        return res.json();
      }

      return { verified: false, message: 'Unsupported processor' };
    },
  };
}

// =============================================================================
// PAYMENT SCREEN
// =============================================================================

function PaymentScreen() {
  const [amount, setAmount] = useState('5000');
  const [email, setEmail] = useState('test@example.com');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    console.log('App mounted');
  }, []);

  const request: PaymentRequest = {
    amount: Number(amount) || 0,
    currency: 'NGN',
    reference: `SPW-${Date.now()}`,
    email,
    // Optional metadata forwarded to the processor by your backend
    metadata: {
      orderId: `ORDER-${Date.now()}`,
      app: 'SmartPayWeb',
    },
  };

  const { processors, defaultProcessor } = usePaymentProcessors();
  const {
    pay,
    selectProcessor,
    cancelSelection,
    isProcessing,
    isSelecting,
    response,
    error,
    failedProcessorIds,
    timedOutProcessorIds,
    reset,
  } = usePayment(request);

  const addLog = (msg: string) => {
    setLogs((prev) =>
      [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev].slice(0, 50),
    );
  };

  const handlePay = async () => {
    reset();
    addLog('Starting payment...');
    try {
      const result: PaymentResponse = await pay();
      console.log('Payment result:', result);
      addLog(`Result: ${result.status} | Ref: ${result.reference}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${message}`);
    }
  };

  return (
    <div className="payment-screen">
      <h1>Payment Gateway SDK Test — Web</h1>
      <p className="subtitle">Paystack · Flutterwave · Interswitch</p>

      <div className="input-group">
        <label>Amount (kobo)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="info-box">
        <p>
          Default processor:{' '}
          {defaultProcessor?.type ?? 'none (selector will show)'}
        </p>
        <p>Total processors: {processors.length}</p>
      </div>

      <button
        className="pay-button"
        onClick={handlePay}
        disabled={isProcessing}
      >
        {isProcessing ? 'Processing...' : 'Pay Now'}
      </button>

      {error && (
        <div className="error-box">
          <p>{error.message}</p>
        </div>
      )}

      {response && (
        <div className="success-box">
          <p>
            {response.status.toUpperCase()} — {response.reference}
          </p>
        </div>
      )}

      <h2 className="log-title">Event Log</h2>
      <div className="log-box">
        {logs.length === 0 ? (
          <p className="log-empty">No events yet. Tap Pay Now.</p>
        ) : (
          logs.map((log, i) => (
            <p key={i} className="log-line">
              {log}
            </p>
          ))
        )}
      </div>

      {/*
        SELECTOR BEHAVIOR

        - No processor has `isDefault: true` in this example, so the selector
          opens for the user to choose a processor on every payment.
        - Set `isDefault: true` on one processor to skip the selector when
          `pay()` is called; the default processor will launch directly.
        - On the web, the popup opens immediately after selection, so the
          selector closes as soon as the user picks a processor.
      */}

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

// =============================================================================
// APP ROOT
// =============================================================================

export default function App() {
  return (
    <PaymentGatewayProvider config={buildConfig()}>
      <div className="app-container">
        <div className="backend-info">
          <label>Backend routing</label>
          <code>Same-origin paths → Vercel rewrites → demo backend</code>
        </div>
        <PaymentScreen />
      </div>
    </PaymentGatewayProvider>
  );
}
