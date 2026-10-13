import type { PaymentResponse, ProcessorConfig } from './types';
import type { PaymentAction } from './types/actions';

export interface PaymentState {
  processors: ProcessorConfig[];
  defaultProcessor: ProcessorConfig | undefined;
  activeProcessorId?: string;
  failedProcessorIds: string[];
  timedOutProcessorIds: string[];
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

export const initialState: PaymentState = {
  processors: [],
  defaultProcessor: undefined,
  failedProcessorIds: [],
  timedOutProcessorIds: [],
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
        activeProcessorId: undefined,
        failedProcessorIds: [],
        timedOutProcessorIds: [],
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
    case 'PROCESSOR_FAILED': {
      const failedProcessorIds = Array.from(
        new Set([...state.failedProcessorIds, action.payload.processorId])
      );
      return {
        ...state,
        activeProcessorId: undefined,
        failedProcessorIds,
        transaction: action.payload.showSelector
          ? { status: 'selecting' }
          : { status: 'error', error: new Error('Processor unavailable') },
      };
    }
    case 'PROCESSOR_TIMED_OUT': {
      const timedOutProcessorIds = Array.from(
        new Set([...state.timedOutProcessorIds, action.payload.processorId])
      );
      return {
        ...state,
        activeProcessorId: undefined,
        timedOutProcessorIds,
        transaction: action.payload.showSelector
          ? {
              status: 'selecting',
              error: new Error(
                `Processor timed out after ${action.payload.timeoutMs}ms`
              ),
            }
          : {
              status: 'error',
              error: new Error(
                `Processor timed out after ${action.payload.timeoutMs}ms`
              ),
            },
      };
    }
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