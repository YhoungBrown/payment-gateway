import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  usePaymentContext,
  type InitializeResult,
  type PaymentRequest,
  type PaymentResponse,
} from '@org/payment-gateway-core';
import { CheckoutWebView } from './checkout/CheckoutWebView';

export function usePayment(request: PaymentRequest) {
  const { state, pay, selectProcessor, cancelSelection, config } = usePaymentContext();
  const [checkoutResult, setCheckoutResult] = useState<InitializeResult | null>(null);
  const [lastResponse, setLastResponse] = useState<PaymentResponse | undefined>();
  const [lastError, setLastError] = useState<Error | null>(null);

  const resolverRef = useRef<{
    resolve: (value: PaymentResponse) => void;
    reject: (reason?: Error) => void;
  } | null>(null);

  const processor = useMemo(() => {
    return (
      state.defaultProcessor ||
      state.processors.find((p) => p.id === state.activeProcessorId)
    );
  }, [state]);

  const finalizeCheckout = useCallback((response: PaymentResponse) => {
    setCheckoutResult(null);
    resolverRef.current?.resolve(response);
    resolverRef.current = null;
  }, []);

  const handleComplete = useCallback(
    (response: PaymentResponse) => {
      finalizeCheckout(response);
    },
    [finalizeCheckout]
  );

  const handleCancel = useCallback(() => {
    const response: PaymentResponse = {
      status: 'cancelled',
      reference: '',
      processor: processor?.type || 'paystack',
      message: 'Checkout cancelled',
    };
    setLastResponse(response);
    finalizeCheckout(response);
  }, [processor, finalizeCheckout]);

  const launchCheckout = useCallback(
    async (result: InitializeResult) => {
      return new Promise<PaymentResponse>((resolve, reject) => {
        resolverRef.current = { resolve, reject };
        setCheckoutResult(result);
      });
    },
    []
  );

  const handlePayment = useCallback(
    async (paymentPromise: Promise<PaymentResponse>) => {
      try {
        setLastError(null);
        const response = await paymentPromise;
        setLastResponse(response);
        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setLastError(err);
        throw err;
      }
    },
    []
  );

  const payFn = useCallback(() => {
    return handlePayment(pay(request, launchCheckout));
  }, [pay, request, launchCheckout, handlePayment]);

  const selectProcessorFn = useCallback(
    (processorId: string) => {
      return handlePayment(selectProcessor(processorId, request, launchCheckout));
    },
    [selectProcessor, request, launchCheckout, handlePayment]
  );

  const reset = useCallback(() => {
    setCheckoutResult(null);
    setLastResponse(undefined);
    setLastError(null);
    resolverRef.current = null;
  }, []);

  const CheckoutView = useMemo(() => {
    if (!checkoutResult || !processor) return null;

    console.log('[usePayment] Using CheckoutWebView for', processor.type);
    return (
      <CheckoutWebView
        result={checkoutResult}
        processor={processor}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    );
  }, [
    checkoutResult,
    processor,
    request.reference,
    config.debug,
    config.verify,
    handleComplete,
    handleCancel,
  ]);

  return useMemo(
    () => ({
      pay: payFn,
      selectProcessor: selectProcessorFn,
      cancelSelection,
      CheckoutView,
      isProcessing:
        state.transaction.status === 'initializing' ||
        state.transaction.status === 'processor_selected' ||
        state.transaction.status === 'processing' ||
        state.transaction.status === 'verifying',
      isSelecting:
        state.transaction.status === 'selecting' ||
        state.transaction.status === 'processor_selected',
      activeProcessorId: state.activeProcessorId,
      response: lastResponse,
      error: lastError,
      reset,
    }),
    [
      payFn,
      selectProcessorFn,
      cancelSelection,
      CheckoutView,
      state.transaction.status,
      state.activeProcessorId,
      lastResponse,
      lastError,
      reset,
    ]
  );
}
