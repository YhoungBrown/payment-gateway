import { describe, it, expect } from 'vitest';
import { initialState, paymentReducer } from '../reducer';
import type { ProcessorConfig } from '../types';
import type { PaymentAction } from '../types/actions';

const processor: ProcessorConfig = {
  id: 'paystack-1',
  type: 'paystack',
  publicKey: 'pk_test',
  callbackUrl: 'https://example.com/callback',
};

describe('paymentReducer', () => {
  it('should start payment', () => {
    const state = paymentReducer(initialState, { type: 'START_PAYMENT' });
    expect(state.transaction.status).toBe('initializing');
  });

  it('should show selector', () => {
    const state = paymentReducer(initialState, { type: 'SHOW_SELECTOR' });
    expect(state.transaction.status).toBe('selecting');
  });

  it('should select processor', () => {
    const state = paymentReducer(
      { ...initialState, processors: [processor] },
      { type: 'SELECT_PROCESSOR', payload: { processorId: processor.id } }
    );
    expect(state.transaction.status).toBe('processor_selected');
    expect(state.activeProcessorId).toBe(processor.id);
  });

  it('should cancel selection', () => {
    const state = paymentReducer(initialState, { type: 'CANCEL_SELECTION' });
    expect(state.transaction.status).toBe('done');
    expect(state.transaction.response?.status).toBe('cancelled');
  });

  it('should complete verification', () => {
    const response = {
      status: 'success' as const,
      reference: 'REF-123',
      processor: processor.type,
    };
    const state = paymentReducer(initialState, {
      type: 'VERIFICATION_COMPLETE',
      payload: { response },
    });
    expect(state.transaction.status).toBe('done');
    expect(state.transaction.response).toEqual(response);
  });

  it('should handle error', () => {
    const error = new Error('Failed');
    const state = paymentReducer(initialState, {
      type: 'PAYMENT_ERROR',
      payload: { error },
    });
    expect(state.transaction.status).toBe('error');
    expect(state.transaction.error).toBe(error);
  });

  it('should handle processor timeout and keep selector open when possible', () => {
    const action: PaymentAction = {
      type: 'PROCESSOR_TIMED_OUT',
      payload: {
        processorId: 'paystack-1',
        timeoutMs: 2000,
        showSelector: true,
      },
    };
    const state = paymentReducer(initialState, action);

    expect(state.transaction.status).toBe('selecting');
    expect(state.transaction.error?.message).toContain('timed out');
    expect(state.failedProcessorIds).toEqual([]);
    expect(state.timedOutProcessorIds).toEqual(['paystack-1']);
  });

  it('should clear timedOutProcessorIds on START_PAYMENT', () => {
    const withTimeout = paymentReducer(initialState, {
      type: 'PROCESSOR_TIMED_OUT',
      payload: {
        processorId: 'paystack-1',
        timeoutMs: 2000,
        showSelector: true,
      },
    });
    expect(withTimeout.timedOutProcessorIds).toEqual(['paystack-1']);

    const afterRestart = paymentReducer(withTimeout, { type: 'START_PAYMENT' });
    expect(afterRestart.timedOutProcessorIds).toEqual([]);
  });
});
