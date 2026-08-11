import { describe, it, expect } from 'vitest';
import { initialState, paymentReducer } from '../reducer';
import type { ProcessorConfig } from '../types';

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
    expect(state.transaction.status).toBe('processing');
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
});
