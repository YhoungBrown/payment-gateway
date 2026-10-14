import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
  PaymentProcessorSelector,
} from '@conitepay/react';

function App() {
  const request = {
    amount: 10000,
    currency: 'NGN',
    reference: 'E2E-REF-123',
    email: 'test@example.com',
  };

  const { processors, defaultProcessor } = usePaymentProcessors();
  const { pay, selectProcessor, cancelSelection, isProcessing, isSelecting, response, error } =
    usePayment(request);
  const [logs, setLogs] = useState([]);

  const handlePay = async () => {
    setLogs((prev) => [...prev, 'pay() called']);
    const result = await pay();
    setLogs((prev) => [...prev, `response: ${JSON.stringify(result)}`]);
  };

  return (
    React.createElement('div', null,
      React.createElement('h1', null, 'Payment Gateway E2E'),
      React.createElement('div', { 'data-testid': 'default-processor' }, defaultProcessor?.id || 'none'),
      React.createElement('div', { 'data-testid': 'processor-count' }, String(processors.length)),
      React.createElement('button', { 'data-testid': 'pay-button', onClick: handlePay }, 'Pay'),
      React.createElement('div', { 'data-testid': 'processing' }, String(isProcessing)),
      React.createElement('div', { 'data-testid': 'selecting' }, String(isSelecting)),
      React.createElement('div', { 'data-testid': 'response' }, response ? response.status : 'none'),
      React.createElement('div', { 'data-testid': 'error' }, error ? error.message : 'none'),
      React.createElement('ul', { 'data-testid': 'logs' },
        logs.map((log, i) => React.createElement('li', { key: i }, log))
      ),
      React.createElement(PaymentProcessorSelector, {
        open: isSelecting,
        processors,
        onSelect: selectProcessor,
        onCancel: cancelSelection,
      })
    )
  );
}

const config = {
  debug: true,
  processors: [
    {
      id: 'flutterwave-1',
      type: 'flutterwave',
      publicKey: 'pk_test',
      callbackUrl: `${window.location.origin}/e2e/fixtures/callback`,
      isDefault: true,
    },
  ],
  initialize: async () => ({
      checkoutUrl: `${window.location.origin}/e2e/fixtures/checkout.html`,
  }),
};

const root = createRoot(document.getElementById('root'));
root.render(
  React.createElement(PaymentGatewayProvider, { config }, React.createElement(App))
);
