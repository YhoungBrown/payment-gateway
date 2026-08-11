import type {
  InitializeResult,
  PaymentRequest,
  PaymentResponse,
  ProcessorConfig,
} from '../types';
import type { PaymentAdapter } from './base';
import { CheckoutInitializationError } from '../errors';
import { buildCallbackResponse } from './base';

export class FlutterwaveAdapter implements PaymentAdapter {
  async initializeCheckout(
    request: PaymentRequest,
    processor: ProcessorConfig,
    initialize?: (
      request: PaymentRequest,
      processor: ProcessorConfig
    ) => Promise<InitializeResult>
  ): Promise<InitializeResult> {
    if (initialize) {
      return initialize(request, processor);
    }
    throw new CheckoutInitializationError(
      'Flutterwave checkout requires an initialize callback because initialization must happen server-side with a secret key.'
    );
  }

  parseCallback(url: string, processor: ProcessorConfig): PaymentResponse {
    const parsedUrl = new URL(url);
    const status = parsedUrl.searchParams.get('status') || '';
    const reference = parsedUrl.searchParams.get('tx_ref') || '';
    const processorReference =
      parsedUrl.searchParams.get('transaction_id') || undefined;

    let paymentStatus: PaymentResponse['status'];
    switch (status.toLowerCase()) {
      case 'successful':
      case 'success':
        paymentStatus = 'success';
        break;
      case 'cancelled':
      case 'canceled':
        paymentStatus = 'cancelled';
        break;
      case 'failed':
      case 'failure':
        paymentStatus = 'failed';
        break;
      default:
        paymentStatus = 'pending';
    }

    return buildCallbackResponse(
      paymentStatus,
      reference,
      processor,
      processorReference,
      `Flutterwave callback status: ${status}`
    );
  }
}
