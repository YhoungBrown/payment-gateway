import React, {
  createContext,
  useContext,
  useMemo,
  useReducer,
  useCallback,
  useRef,
} from 'react';
import type {
  InitializeResult,
  PaymentGatewayConfig,
  PaymentRequest,
  PaymentResponse,
  ProcessorConfig,
} from './types';
import {
  DuplicateDefaultProcessorError,
  MissingConfigurationError,
  ProcessorNotFoundError,
} from './errors';
import { initialState, paymentReducer } from './reducer';
import { getAdapter } from './adapters';
import { createLogger } from './logger';
import { validateAmount, validateCurrency } from './utils/money';

export type LaunchCheckout = (
  result: InitializeResult
) => Promise<PaymentResponse>;

export interface PaymentContextValue {
  state: ReturnType<typeof paymentReducer>;
  dispatch: React.Dispatch<import('./reducer').PaymentAction>;
  config: PaymentGatewayConfig;
  pay: (request: PaymentRequest, launchCheckout: LaunchCheckout) => Promise<PaymentResponse>;
  selectProcessor: (
    processorId: string,
    request: PaymentRequest,
    launchCheckout: LaunchCheckout
  ) => Promise<PaymentResponse>;
  cancelSelection: () => void;
}

const PaymentContext = createContext<PaymentContextValue | null>(null);

export function usePaymentContext(): PaymentContextValue {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error(
      'usePaymentContext must be used within a PaymentGatewayProvider'
    );
  }
  return context;
}

function validateConfig(config: PaymentGatewayConfig): {
  processors: ProcessorConfig[];
  defaultProcessor: ProcessorConfig | undefined;
} {
  if (!config.processors || config.processors.length === 0) {
    throw new MissingConfigurationError();
  }

  const defaults = config.processors.filter((p) => p.isDefault);
  if (defaults.length > 1) {
    throw new DuplicateDefaultProcessorError();
  }

  return {
    processors: config.processors,
    defaultProcessor: defaults[0],
  };
}

export interface PaymentGatewayProviderProps {
  config: PaymentGatewayConfig;
  children: React.ReactNode;
}

export function PaymentGatewayProvider({
  config,
  children,
}: PaymentGatewayProviderProps): React.ReactElement {
  const { processors, defaultProcessor } = useMemo(
    () => validateConfig(config),
    [config]
  );

  const [state, dispatch] = useReducer(paymentReducer, {
    ...initialState,
    processors,
    defaultProcessor,
  });

  const logger = useMemo(
    () => createLogger(config.debug || false),
    [config.debug]
  );

  const selectionRef = useRef<{
    resolve: (value: PaymentResponse) => void;
    reject: (reason?: Error) => void;
    launchCheckout?: LaunchCheckout;
    request?: PaymentRequest;
  } | null>(null);

  const initializeCheckout = useCallback(
    async (
      request: PaymentRequest,
      processor: ProcessorConfig
    ): Promise<InitializeResult> => {
      logger.log('Initializing checkout', {
        processorId: processor.id,
        type: processor.type,
      });
      validateAmount(request.amount);
      validateCurrency(request.currency);

      const adapter = getAdapter(processor.type);
      const result = await adapter.initializeCheckout(
        request,
        processor,
        config.initialize
      );

      logger.log('Checkout URL initialized', { processorId: processor.id });
      return result;
    },
    [config.initialize, logger]
  );

  const verifyResponse = useCallback(
    async (response: PaymentResponse): Promise<PaymentResponse> => {
      logger.log('Verifying payment response', {
        reference: response.reference,
      });
      dispatch({ type: 'CALLBACK_RECEIVED', payload: { response } });

      let finalResponse = response;

      if (config.verify) {
        const verification = await config.verify(response);
        if (verification.verified) {
          finalResponse = {
            ...response,
            status: response.status === 'pending' ? 'success' : response.status,
            message: verification.message || response.message,
          };
        } else {
          finalResponse = {
            ...response,
            status: 'failed',
            message: verification.message || 'Verification failed',
          };
        }
      }

      dispatch({
        type: 'VERIFICATION_COMPLETE',
        payload: { response: finalResponse },
      });
      logger.log('Verification complete', { status: finalResponse.status });
      return finalResponse;
    },
    [config.verify, logger]
  );

  const launchProcessor = useCallback(
    async (
      request: PaymentRequest,
      processor: ProcessorConfig,
      launchCheckout: LaunchCheckout
    ): Promise<PaymentResponse> => {
      dispatch({ type: 'CHECKOUT_INITIALIZED' });
      const result = await initializeCheckout(request, processor);
      const response = await launchCheckout(result);
      return verifyResponse(response);
    },
    [initializeCheckout, verifyResponse]
  );

  const selectProcessor = useCallback(
    async (
      processorId: string,
      request: PaymentRequest,
      launchCheckout: LaunchCheckout
    ): Promise<PaymentResponse> => {
      const processor = processors.find((p) => p.id === processorId);
      if (!processor) {
        throw new ProcessorNotFoundError(processorId);
      }

      dispatch({ type: 'SELECT_PROCESSOR', payload: { processorId } });
      logger.log('Processor selected', { processorId });

      try {
        const response = await launchProcessor(
          request,
          processor,
          launchCheckout
        );
        if (selectionRef.current) {
          selectionRef.current.resolve(response);
          selectionRef.current = null;
        }
        return response;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (selectionRef.current) {
          selectionRef.current.reject(err);
          selectionRef.current = null;
        }
        dispatch({ type: 'PAYMENT_ERROR', payload: { error: err } });
        throw err;
      }
    },
    [processors, launchProcessor, logger]
  );

  const pay = useCallback(
    async (
      request: PaymentRequest,
      launchCheckout: LaunchCheckout
    ): Promise<PaymentResponse> => {
      logger.log('Starting payment', { reference: request.reference });
      dispatch({ type: 'START_PAYMENT' });

      if (defaultProcessor) {
        logger.log('Using default processor', {
          processorId: defaultProcessor.id,
        });
        try {
          return await launchProcessor(
            request,
            defaultProcessor,
            launchCheckout
          );
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          dispatch({ type: 'PAYMENT_ERROR', payload: { error: err } });
          throw err;
        }
      }

      logger.log('No default processor, showing selector');
      dispatch({ type: 'SHOW_SELECTOR' });

      return new Promise((resolve, reject) => {
        selectionRef.current = { resolve, reject, launchCheckout, request };
      });
    },
    [defaultProcessor, launchProcessor, logger]
  );

  const cancelSelection = useCallback((): void => {
    logger.log('Cancelling processor selection');
    dispatch({ type: 'CANCEL_SELECTION' });

    if (selectionRef.current) {
      selectionRef.current.reject(
        new Error('User cancelled processor selection')
      );
      selectionRef.current = null;
    }
  }, [logger]);

  const value = useMemo(
    () => ({
      state,
      dispatch,
      config,
      pay,
      selectProcessor,
      cancelSelection,
    }),
    [state, dispatch, config, pay, selectProcessor, cancelSelection]
  );

  return (
    <PaymentContext.Provider value={value}>{children}</PaymentContext.Provider>
  );
}
