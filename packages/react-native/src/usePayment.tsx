import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  usePaymentContext,
  type InitializeResult,
  type PaymentRequest,
  type PaymentResponse,
  type ProcessorConfig,
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

  const wasCheckoutMountedRef = useRef(false);

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
    async (result: InitializeResult, _processor: ProcessorConfig) => {
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
    wasCheckoutMountedRef.current = false;
  }, []);

  const CheckoutView = useMemo(() => {
    if (!checkoutResult || !processor) return null;

    // Track that the checkout view was mounted during this payment attempt
    // so the selector does not re-open during the redirect/verification phase.
    wasCheckoutMountedRef.current = true;

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
    () => {
      const isProcessing =
        state.transaction.status === 'initializing' ||
        state.transaction.status === 'processor_selected' ||
        state.transaction.status === 'processing' ||
        state.transaction.status === 'verifying';
      const isSelecting =
        state.transaction.status === 'selecting' ||
        state.transaction.status === 'processor_selected';
      const hasActiveProcessorId = Boolean(state.activeProcessorId);

      const showProcessorSelector =
        isSelecting ||
        (isProcessing && hasActiveProcessorId && !wasCheckoutMountedRef.current);

      return {
        pay: payFn,
        selectProcessor: selectProcessorFn,
        cancelSelection,
        CheckoutView,
        isProcessing,
        isSelecting,
        showProcessorSelector,
        activeProcessorId: state.activeProcessorId,
        hasActiveProcessorId,
        wasCheckoutMounted: wasCheckoutMountedRef.current,
        failedProcessorIds: state.failedProcessorIds,
        response: lastResponse,
        error: lastError,
        reset,
      };
    },
    [
      payFn,
      selectProcessorFn,
      cancelSelection,
      CheckoutView,
      state.transaction.status,
      state.activeProcessorId,
      state.failedProcessorIds,
      lastResponse,
      lastError,
      reset,
      checkoutResult,
    ]
  );
}