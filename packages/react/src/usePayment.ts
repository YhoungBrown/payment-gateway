import { useCallback, useMemo, useState } from 'react';
import {
  usePaymentContext,
  type InitializeResult,
  type PaymentRequest,
  type PaymentResponse,
} from '@org/payment-gateway-core';
import { launchCheckoutPopup } from './checkout/CheckoutPopup';

export function usePayment(request: PaymentRequest) {
  const { state, pay, selectProcessor, cancelSelection } = usePaymentContext();
  const [lastResponse, setLastResponse] = useState<PaymentResponse | undefined>();
  const [lastError, setLastError] = useState<Error | null>(null);

  const launchCheckout = useCallback(
    async (result: InitializeResult) => {
      const processor =
        state.defaultProcessor ||
        state.processors.find((p) => p.id === state.activeProcessorId);
      if (!processor) {
        throw new Error('No processor available for checkout launch');
      }
      return launchCheckoutPopup(result, processor);
    },
    [state]
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
    setLastResponse(undefined);
    setLastError(null);
  }, []);

  return useMemo(
    () => ({
      pay: payFn,
      selectProcessor: selectProcessorFn,
      cancelSelection,
      isProcessing:
        state.transaction.status === 'initializing' ||
        state.transaction.status === 'processing' ||
        state.transaction.status === 'verifying',
      isSelecting: state.transaction.status === 'selecting',
      response: lastResponse,
      error: lastError,
      reset,
    }),
    [
      payFn,
      selectProcessorFn,
      cancelSelection,
      state.transaction.status,
      lastResponse,
      lastError,
      reset,
    ]
  );
}
