// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PaymentGatewayProvider, usePaymentContext } from '../context';
import type { PaymentGatewayConfig, PaymentRequest, PaymentResponse } from '../types';

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
    fireEvent.click(screen.getByText('Pay'));
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

    fireEvent.click(screen.getByText('Pay'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('selecting')
    );

    fireEvent.click(screen.getByText('Select Flutterwave'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('done')
    );
  });

  it('should promote pending status to success when verification succeeds', async () => {
    const verify = vi.fn().mockResolvedValue({ verified: true, message: 'Verified by backend' });

    const VerifyConsumer = () => {
      const { pay } = usePaymentContext();
      const [result, setResult] = useState<PaymentResponse | null>(null);
      return (
        <div>
          <button
            onClick={async () => {
              const response = await pay(baseRequest, async () => ({
                status: 'pending' as const,
                reference: 'REF-PENDING',
                processor: 'paystack' as const,
              }));
              setResult(response);
            }}
          >
            Pay Pending
          </button>
          {result && <div data-testid="result-status">{result.status}</div>}
          {result && <div data-testid="result-message">{result.message}</div>}
        </div>
      );
    };

    const configWithVerify: PaymentGatewayConfig = {
      ...baseConfig,
      verify,
    };

    render(
      <PaymentGatewayProvider config={configWithVerify}>
        <VerifyConsumer />
      </PaymentGatewayProvider>
    );

    fireEvent.click(screen.getByText('Pay Pending'));

    await waitFor(() =>
      expect(screen.getByTestId('result-status').textContent).toBe('success')
    );
    expect(screen.getByTestId('result-message').textContent).toBe(
      'Verified by backend'
    );
    expect(verify).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending', reference: 'REF-PENDING' })
    );
  });

  it('should keep a non-pending status when verification succeeds', async () => {
    const verify = vi.fn().mockResolvedValue({ verified: true });

    const VerifyConsumer = () => {
      const { pay } = usePaymentContext();
      const [result, setResult] = useState<PaymentResponse | null>(null);
      return (
        <div>
          <button
            onClick={async () => {
              const response = await pay(baseRequest, async () => ({
                status: 'failed' as const,
                reference: 'REF-FAILED',
                processor: 'paystack' as const,
              }));
              setResult(response);
            }}
          >
            Pay Failed
          </button>
          {result && <div data-testid="result-status">{result.status}</div>}
        </div>
      );
    };

    const configWithVerify: PaymentGatewayConfig = {
      ...baseConfig,
      processors: [baseConfig.processors[0]], // single processor so fallback does not apply
      verify,
    };

    render(
      <PaymentGatewayProvider config={configWithVerify}>
        <VerifyConsumer />
      </PaymentGatewayProvider>
    );

    fireEvent.click(screen.getByText('Pay Failed'));

    await waitFor(() =>
      expect(screen.getByTestId('result-status').textContent).toBe('failed')
    );
  });

  it('should fall back to selector when default processor checkout fails', async () => {
    const FallbackConsumer = () => {
      const { state, pay, selectProcessor } = usePaymentContext();
      return (
        <div>
          <div data-testid="status">{state.transaction.status}</div>
          <div data-testid="failed-count">
            {state.failedProcessorIds.length}
          </div>
          <button
            onClick={() =>
              pay(baseRequest, async () => ({
                status: 'failed',
                reference: 'REF-FAILED',
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
                reference: 'REF-FW',
                processor: 'flutterwave',
              }))
            }
          >
            Select Flutterwave
          </button>
        </div>
      );
    };

    render(
      <PaymentGatewayProvider config={baseConfig}>
        <FallbackConsumer />
      </PaymentGatewayProvider>
    );

    fireEvent.click(screen.getByText('Pay'));

    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('selecting')
    );
    expect(screen.getByTestId('failed-count').textContent).toBe('1');

    fireEvent.click(screen.getByText('Select Flutterwave'));

    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('done')
    );
  });

  it('should fall back to selector when selected processor checkout fails', async () => {
    const configWithoutDefault: PaymentGatewayConfig = {
      ...baseConfig,
      processors: [
        { ...baseConfig.processors[0], isDefault: false },
        baseConfig.processors[1],
      ],
    };

    const FallbackConsumer = () => {
      const { state, pay, selectProcessor } = usePaymentContext();
      return (
        <div>
          <div data-testid="status">{state.transaction.status}</div>
          <div data-testid="failed-count">
            {state.failedProcessorIds.length}
          </div>
          <button
            onClick={() =>
              pay(baseRequest, async () => ({
                status: 'success',
                reference: 'REF-OK',
                processor: 'paystack',
              }))
            }
          >
            Pay
          </button>
          <button
            onClick={() =>
              selectProcessor('paystack-1', baseRequest, async () => ({
                status: 'failed',
                reference: 'REF-FAILED',
                processor: 'paystack',
              }))
            }
          >
            Select Paystack
          </button>
          <button
            onClick={() =>
              selectProcessor('flutterwave-1', baseRequest, async () => ({
                status: 'success',
                reference: 'REF-FW',
                processor: 'flutterwave',
              }))
            }
          >
            Select Flutterwave
          </button>
        </div>
      );
    };

    render(
      <PaymentGatewayProvider config={configWithoutDefault}>
        <FallbackConsumer />
      </PaymentGatewayProvider>
    );

    fireEvent.click(screen.getByText('Pay'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('selecting')
    );

    fireEvent.click(screen.getByText('Select Paystack'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('selecting')
    );
    expect(screen.getByTestId('failed-count').textContent).toBe('1');

    fireEvent.click(screen.getByText('Select Flutterwave'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('done')
    );
  });

  it('should return failed response when all processors fail', async () => {
    const FailedConsumer = () => {
      const { state, pay, selectProcessor } = usePaymentContext();
      const [result, setResult] = useState<PaymentResponse | null>(null);
      return (
        <div>
          <div data-testid="status">{state.transaction.status}</div>
          <button
            onClick={async () => {
              const response = await pay(baseRequest, async () => ({
                status: 'failed',
                reference: 'REF-FAILED',
                processor: 'paystack',
              }));
              setResult(response);
            }}
          >
            Pay
          </button>
          <button
            onClick={() =>
              selectProcessor('flutterwave-1', baseRequest, async () => ({
                status: 'failed',
                reference: 'REF-FW-FAILED',
                processor: 'flutterwave',
              }))
            }
          >
            Select Flutterwave
          </button>
          {result && (
            <div data-testid="result-status">{result.status}</div>
          )}
        </div>
      );
    };

    render(
      <PaymentGatewayProvider config={baseConfig}>
        <FailedConsumer />
      </PaymentGatewayProvider>
    );

    fireEvent.click(screen.getByText('Pay'));
    await waitFor(() =>
      expect(screen.getByTestId('status').textContent).toBe('selecting')
    );

    fireEvent.click(screen.getByText('Select Flutterwave'));
    await waitFor(() =>
      expect(screen.getByTestId('result-status').textContent).toBe('failed')
    );
  });
});
