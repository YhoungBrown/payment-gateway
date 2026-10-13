import type { PaymentResponse } from '../types';

export type PaymentAction =
  | { type: 'START_PAYMENT' }
  | { type: 'SHOW_SELECTOR' }
  | { type: 'SELECT_PROCESSOR'; payload: { processorId: string } }
  | { type: 'CANCEL_SELECTION' }
  | { type: 'CHECKOUT_INITIALIZED' }
  | { type: 'CALLBACK_RECEIVED'; payload: { response: PaymentResponse } }
  | { type: 'VERIFICATION_COMPLETE'; payload: { response: PaymentResponse } }
  | { type: 'PAYMENT_ERROR'; payload: { error: Error } }
  | {
      type: 'PROCESSOR_FAILED';
      payload: { processorId: string; showSelector: boolean };
    }
  | {
      type: 'PROCESSOR_TIMED_OUT';
      payload: { processorId: string; timeoutMs: number; showSelector: boolean };
    }
  | { type: 'RESET' };
