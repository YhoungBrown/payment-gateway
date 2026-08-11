import type {
  InitializeResult,
  PaymentRequest,
  PaymentResponse,
  ProcessorConfig,
} from '../types';

export interface PaymentAdapter {
  initializeCheckout(
    request: PaymentRequest,
    processor: ProcessorConfig,
    initialize?: (
      request: PaymentRequest,
      processor: ProcessorConfig
    ) => Promise<InitializeResult | undefined>
  ): Promise<InitializeResult>;
  parseCallback(url: string, processor: ProcessorConfig): PaymentResponse;
}

export function buildCallbackResponse(
  status: PaymentResponse['status'],
  reference: string,
  processor: ProcessorConfig,
  processorReference?: string,
  message?: string
): PaymentResponse {
  return {
    status,
    reference,
    processor: processor.type,
    processorReference,
    message,
  };
}
