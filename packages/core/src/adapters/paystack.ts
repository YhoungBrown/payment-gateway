import type {
  InitializeResult,
  PaymentRequest,
  PaymentResponse,
  ProcessorConfig,
} from '../types';
import type { PaymentAdapter } from './base';
import { CheckoutInitializationError } from '../errors';
import { buildCallbackResponse } from './base';

export class PaystackAdapter implements PaymentAdapter {
  async initializeCheckout(
    request: PaymentRequest,
    processor: ProcessorConfig,
    initialize?: (
      request: PaymentRequest,
      processor: ProcessorConfig
    ) => Promise<InitializeResult | undefined>
  ): Promise<InitializeResult> {
    if (initialize) {
      const result = await initialize(request, processor);
      if (result) return result;
    }
    throw new CheckoutInitializationError(
      'Paystack checkout requires an initialize callback because initialization must happen server-side with a secret key.'
    );
  }

  parseCallback(url: string, processor: ProcessorConfig): PaymentResponse {
    const parsedUrl = new URL(url);
    const reference = parsedUrl.searchParams.get('reference') || '';
    const processorReference = parsedUrl.searchParams.get('trxref') || undefined;
    const status = parsedUrl.searchParams.get('status') || '';

    let paymentStatus: PaymentResponse['status'];
    switch (status.toLowerCase()) {
      case 'success':
      case 'successful':
        paymentStatus = 'success';
        break;
      case 'failed':
      case 'failure':
      case 'abandoned':
        paymentStatus = 'failed';
        break;
      case 'cancelled':
      case 'canceled':
        paymentStatus = 'cancelled';
        break;
      default:
        paymentStatus = 'pending';
    }

    return buildCallbackResponse(
      paymentStatus,
      reference,
      processor,
      processorReference,
      paymentStatus === 'pending'
        ? 'Callback received; awaiting verification.'
        : `Paystack callback status: ${status}`
    );
  }
}
