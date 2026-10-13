import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { PaymentGatewayProvider, usePayment, usePaymentProcessors } from '../index';
import type { PaymentGatewayConfig, PaymentRequest, PaymentResponse } from '../index';

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

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <PaymentGatewayProvider config={baseConfig}>{children}</PaymentGatewayProvider>
);

describe('usePaymentProcessors', () => {
  it('should expose configured processors and default', () => {
    const { result } = renderHook(() => usePaymentProcessors(), { wrapper });
    expect(result.current.processors).toHaveLength(2);
    expect(result.current.defaultProcessor?.id).toBe('paystack-1');
  });
});

describe('usePayment', () => {
  let originalOpen: typeof window.open;

  beforeEach(() => {
    originalOpen = window.open;
  });

  afterEach(() => {
    window.open = originalOpen;
  });

  it('should initiate default processor when pay() is called', async () => {
    const flutterwaveDefaultConfig: PaymentGatewayConfig = {
      ...baseConfig,
      processors: [
        { ...baseConfig.processors[0], isDefault: false },
        { ...baseConfig.processors[1], isDefault: true },
      ],
    };

    const flutterwaveWrapper = ({ children }: { children: React.ReactNode }) => (
      <PaymentGatewayProvider config={flutterwaveDefaultConfig}>
        {children}
      </PaymentGatewayProvider>
    );
    const mockPopup = {
      location: { href: 'https://checkout.example.com' },
      closed: false,
      close: vi.fn(),
      document: {
        createElement: document.createElement.bind(document),
        body: document.createElement('body'),
      },
    } as unknown as Window;

    window.open = vi.fn().mockReturnValue(mockPopup);

    const { result } = renderHook(() => usePayment(baseRequest), {
      wrapper: flutterwaveWrapper,
    });

    let payPromise: Promise<PaymentResponse>;
    act(() => {
      payPromise = result.current.pay();
    });

    await waitFor(() => expect(result.current.isProcessing).toBe(true));

    // Simulate callback navigation and await resolution inside act
    const response = await act(async () => {
      Object.defineProperty(mockPopup.location, 'href', {
        value: 'https://example.com/callback?status=successful&tx_ref=REF-123&transaction_id=TRX-456',
        writable: true,
      });
      return payPromise;
    });

    expect(response.status).toBe('success');
    expect(response.reference).toBe('REF-123');
  });

  it('should show selector when no default is configured', async () => {
    const configWithoutDefault: PaymentGatewayConfig = {
      ...baseConfig,
      processors: [
        { ...baseConfig.processors[0], isDefault: false },
        baseConfig.processors[1],
      ],
    };

    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <PaymentGatewayProvider config={configWithoutDefault}>
        {children}
      </PaymentGatewayProvider>
    );

    const { result } = renderHook(() => usePayment(baseRequest), {
      wrapper: customWrapper,
    });

    act(() => {
      result.current.pay();
    });

    await waitFor(() => expect(result.current.isSelecting).toBe(true));
  });

  it('marks processor as timed out when initialization exceeds timeout and keeps it selectable', { timeout: 15000 }, async () => {
    const slowInitializeConfig: PaymentGatewayConfig = {
      ...baseConfig,
      initializeTimeoutMs: 500,
      initialize: () => new Promise(() => {}),
    };

    const slowWrapper = ({ children }: { children: React.ReactNode }) => (
      <PaymentGatewayProvider config={slowInitializeConfig}>
        {children}
      </PaymentGatewayProvider>
    );

    const { result } = renderHook(() => usePayment(baseRequest), {
      wrapper: slowWrapper,
    });

    act(() => {
      result.current.pay().catch(() => {});
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
    });

    await waitFor(() => {
      expect(result.current.isSelecting).toBe(true);
      expect(result.current.failedProcessorIds).toHaveLength(0);
      expect(result.current.timedOutProcessorIds).toHaveLength(1);
    }, { timeout: 3000 });
  });
});
