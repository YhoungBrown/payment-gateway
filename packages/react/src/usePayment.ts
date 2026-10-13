import { useCallback, useMemo, useState } from 'react';
import {
  usePaymentContext,
  type InitializeResult,
  type PaymentRequest,
  type PaymentResponse,
  type ProcessorConfig,
} from '@org/payment-gateway-core';
import { launchCheckoutPopup } from './checkout/CheckoutPopup';

export function usePayment(request: PaymentRequest) {
  const { state, pay, selectProcessor, cancelSelection } = usePaymentContext();
  const [lastResponse, setLastResponse] = useState<PaymentResponse | undefined>();
  const [lastError, setLastError] = useState<Error | null>(null);

  const launchCheckout = useCallback(
    async (result: InitializeResult, processor: ProcessorConfig) => {
      return launchCheckoutPopup(result, processor);
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
    setLastResponse(undefined);
    setLastError(null);
  }, []);

  return useMemo(
    () => ({
      pay: payFn,
      selectProcessor: selectProcessorFn,
      cancelSelection,
      CheckoutView: null,
      isProcessing:
        state.transaction.status === 'initializing' ||
        state.transaction.status === 'processor_selected' ||
        state.transaction.status === 'processing' ||
        state.transaction.status === 'verifying',
      isSelecting:
        state.transaction.status === 'selecting' ||
        state.transaction.status === 'processor_selected',
      showProcessorSelector: false,
      activeProcessorId: state.activeProcessorId,
      hasActiveProcessorId: Boolean(state.activeProcessorId),
      failedProcessorIds: state.failedProcessorIds,
      timedOutProcessorIds: state.timedOutProcessorIds,
      response: lastResponse,
      error: lastError,
      reset,
    }),
    [
      payFn,
      selectProcessorFn,
      cancelSelection,
      state.transaction.status,
      state.activeProcessorId,
      state.failedProcessorIds,
      state.timedOutProcessorIds,
      lastResponse,
      lastError,
      reset,
    ]
  );
}
