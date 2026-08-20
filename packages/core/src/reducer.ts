import type { PaymentResponse, ProcessorConfig } from './types';

export interface PaymentState {
  processors: ProcessorConfig[];
  defaultProcessor: ProcessorConfig | undefined;
  activeProcessorId?: string;
  transaction: {
    status:
      | 'idle'
      | 'initializing'
      | 'selecting'
      | 'processor_selected'
      | 'processing'
      | 'verifying'
      | 'done'
      | 'error';
    response?: PaymentResponse;
    error?: Error;
  };
}

export type PaymentAction =
  | { type: 'START_PAYMENT' }
  | { type: 'SHOW_SELECTOR' }
  | { type: 'SELECT_PROCESSOR'; payload: { processorId: string } }
  | { type: 'CANCEL_SELECTION' }
  | { type: 'CHECKOUT_INITIALIZED' }
  | { type: 'CALLBACK_RECEIVED'; payload: { response: PaymentResponse } }
  | { type: 'VERIFICATION_COMPLETE'; payload: { response: PaymentResponse } }
  | { type: 'PAYMENT_ERROR'; payload: { error: Error } }
  | { type: 'RESET' };

export const initialState: PaymentState = {
  processors: [],
  defaultProcessor: undefined,
  transaction: { status: 'idle' },
};

export function paymentReducer(
  state: PaymentState,
  action: PaymentAction
): PaymentState {
  switch (action.type) {
    case 'START_PAYMENT':
      return {
        ...state,
        transaction: { status: 'initializing' },
      };
    case 'SHOW_SELECTOR':
      return {
        ...state,
        transaction: { status: 'selecting' },
      };
    case 'SELECT_PROCESSOR':
      return {
        ...state,
        activeProcessorId: action.payload.processorId,
        transaction: { status: 'processor_selected' },
      };
    case 'CANCEL_SELECTION':
      return {
        ...state,
        activeProcessorId: undefined,
        transaction: {
          status: 'done',
          response: {
            status: 'cancelled',
            reference: '',
            processor: state.defaultProcessor?.type || 'paystack',
            message: 'User cancelled processor selection',
          },
        },
      };
    case 'CHECKOUT_INITIALIZED':
      return {
        ...state,
        transaction: { status: 'processing' },
      };
    case 'CALLBACK_RECEIVED':
      return {
        ...state,
        transaction: { status: 'verifying', response: action.payload.response },
      };
    case 'VERIFICATION_COMPLETE':
      return {
        ...state,
        transaction: { status: 'done', response: action.payload.response },
      };
    case 'PAYMENT_ERROR':
      return {
        ...state,
        transaction: { status: 'error', error: action.payload.error },
      };
    case 'RESET':
      return {
        ...state,
        activeProcessorId: undefined,
        transaction: { status: 'idle' },
      };
    default:
      return state;
  }
}
