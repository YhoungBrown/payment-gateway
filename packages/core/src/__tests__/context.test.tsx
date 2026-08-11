// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PaymentGatewayProvider, usePaymentContext } from '../context';
import type { PaymentGatewayConfig, PaymentRequest } from '../types';

const TestConsumer = () => {
  const { state, pay, selectProcessor, cancelSelection } = usePaymentContext();
  return (
    <div>
      <div data-testid="status">{state.transaction.status}</div>
      <div data-testid="processor-count">{state.processors.length}</div>
      <button
        onClick={() =>
          pay(baseRequest, async () => ({
            status: 'success',
            reference: 'REF-123',
            processor: 'paystack',
          }))
        }
      >
        Pay
      </button>
      <button
        onClick={() =>
          selectProcessor('flutterwave-1', baseRequest, async () => ({
            status: 'success',
            reference: 'REF-123',
            processor: 'flutterwave',
          }))
        }
      >
        Select Flutterwave
      </button>
      <button onClick={cancelSelection}>Cancel</button>
    </div>
  );
};

const baseRequest: PaymentRequest = {
  amount: 10000,
  currency: 'NGN',
  reference: 'REF-123',
  email: 'test@example.com',
};

const baseConfig: PaymentGatewayConfig = {
  processors: [
    {
      id: 'paystack-1',
      type: 'paystack',
      publicKey: 'pk_test',
      callbackUrl: 'https://example.com/callback',
      isDefault: true,
    },
    {
      id: 'flutterwave-1',
      type: 'flutterwave',
      publicKey: 'pk_test',
      callbackUrl: 'https://example.com/callback',
    },
  ],
  initialize: async () => ({
    checkoutUrl: 'https://checkout.example.com',
  }),
};

describe('PaymentGatewayProvider', () => {
  it('should throw on duplicate defaults', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() =>
      render(
        <PaymentGatewayProvider
          config={{
            processors: [
              { ...baseConfig.processors[0] },
              { ...baseConfig.processors[0], id: 'paystack-2' },
            ],
          }}
        >
          <TestConsumer />
        </PaymentGatewayProvider>
      )
    ).toThrow('Only one processor can be marked as default');
    consoleError.mockRestore();
  });

  it('should expose processors and default', () => {
    render(
      <PaymentGatewayProvider config={baseConfig}>
        <TestConsumer />
      </PaymentGatewayProvider>
    );
    expect(screen.getByTestId('processor-count').textContent).toBe('2');
  });

  it('should start payment with default processor', async () => {
    render(
      <PaymentGatewayProvider config={baseConfig}>
        <TestConsumer />
      </PaymentGatewayProvider>
    );
    screen.getByText('Pay').click();
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('done')
    );
  });

  it('should select processor when no default', async () => {
    const configWithoutDefault: PaymentGatewayConfig = {
      ...baseConfig,
      processors: [
        { ...baseConfig.processors[0], isDefault: false },
        baseConfig.processors[1],
      ],
    };

    render(
      <PaymentGatewayProvider config={configWithoutDefault}>
        <TestConsumer />
      </PaymentGatewayProvider>
    );

    screen.getByText('Pay').click();
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('selecting')
    );

    screen.getByText('Select Flutterwave').click();
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('done')
    );
  });
});
