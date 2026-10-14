import { useMemo } from 'react';
import {
  usePaymentContext,
  type UsePaymentProcessorsResult,
} from '@conitepay/core';

export function usePaymentProcessors(): UsePaymentProcessorsResult {
  const { state } = usePaymentContext();

  return useMemo(
    () => ({
      processors: state.processors,
      defaultProcessor: state.defaultProcessor,
    }),
    [state.processors, state.defaultProcessor]
  );
}
