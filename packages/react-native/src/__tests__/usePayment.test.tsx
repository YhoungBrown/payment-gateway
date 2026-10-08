import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
} from '../index';
import type { PaymentGatewayConfig, PaymentRequest } from '../index';

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
  it('should render CheckoutView when pay() is called', async () => {
    const { result } = renderHook(() => usePayment(baseRequest), { wrapper });

    act(() => {
      result.current.pay();
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.isSelecting).toBe(false);
      expect(result.current.CheckoutView).not.toBeNull();
    });
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

  it('keeps selection active while a manually selected processor initializes, then hands off to CheckoutView', async () => {
    let finishInitialization: ((value: { checkoutUrl: string }) => void) | undefined;
    const configWithDelayedInitialization: PaymentGatewayConfig = {
      ...baseConfig,
      processors: baseConfig.processors.map(processor => ({
        ...processor,
        isDefault: false,
      })),
      initialize: () =>
        new Promise(resolve => {
          finishInitialization = resolve;
        }),
    };
    const customWrapper = ({ children }: { children: React.ReactNode }) => (
      <PaymentGatewayProvider config={configWithDelayedInitialization}>
        {children}
      </PaymentGatewayProvider>
    );

    const { result } = renderHook(() => usePayment(baseRequest), {
      wrapper: customWrapper,
    });

    act(() => {
      void result.current.selectProcessor('paystack-1');
    });

    await waitFor(() => {
      expect(result.current.activeProcessorId).toBe('paystack-1');
      expect(result.current.isSelecting).toBe(false);
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.CheckoutView).toBeNull();
      expect(result.current.showProcessorSelector).toBe(true);
    });

    act(() => {
      finishInitialization?.({ checkoutUrl: 'https://checkout.example.com' });
    });

    await waitFor(() => {
      expect(result.current.CheckoutView).not.toBeNull();
      expect(result.current.isSelecting).toBe(false);
      expect(result.current.isProcessing).toBe(true);
      expect(result.current.showProcessorSelector).toBe(false);
    });
  });
});
