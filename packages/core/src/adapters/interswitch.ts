import type {
  InitializeResult,
  PaymentRequest,
  PaymentResponse,
  ProcessorConfig,
} from '../types';
import type { PaymentAdapter } from './base';
import { CheckoutInitializationError } from '../errors';
import { buildCallbackResponse } from './base';

export class InterswitchAdapter implements PaymentAdapter {
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

    const { endpoint, merchantCode, payItemId, callbackUrl } = processor;

    if (!endpoint) {
      throw new CheckoutInitializationError(
        'Interswitch checkout requires an endpoint in ProcessorConfig.endpoint.'
      );
    }
    if (!merchantCode || !payItemId || !callbackUrl) {
      throw new CheckoutInitializationError(
        'Interswitch checkout requires merchantCode, payItemId, and callbackUrl.'
      );
    }

    const postData: Record<string, string> = {
      merchant_code: merchantCode,
      pay_item_id: payItemId,
      site_redirect_url: callbackUrl,
      txn_ref: request.reference,
      amount: String(request.amount),
      currency: this.mapCurrencyToNumeric(request.currency),
      cust_name: (request.metadata?.customerName as string) || request.email,
      cust_id: (request.metadata?.customerId as string) || request.email,
    };

    if (processor.payItemName) {
      postData.pay_item_name = processor.payItemName;
    }

    return {
      checkoutUrl: endpoint,
      method: 'POST',
      postData,
    };
  }

  parseCallback(url: string, processor: ProcessorConfig): PaymentResponse {
    const parsedUrl = new URL(url);
    const reference = parsedUrl.searchParams.get('txnref') || '';
    const responseCode = parsedUrl.searchParams.get('resp') || '';
    const description = parsedUrl.searchParams.get('desc') || undefined;
    const processorReference = parsedUrl.searchParams.get('retRef') || undefined;

    let status: PaymentResponse['status'];
    if (responseCode === '00') {
      status = 'success';
    } else if (responseCode) {
      status = 'failed';
    } else {
      status = 'pending';
    }

    return buildCallbackResponse(
      status,
      reference,
      processor,
      processorReference,
      description
    );
  }

  private mapCurrencyToNumeric(currency: string): string {
    const trimmed = currency.trim();
    if (/^\d+$/.test(trimmed)) {
      return trimmed;
    }

    const map: Record<string, string> = {
      NGN: '566',
    };

    const code = map[trimmed.toUpperCase()];
    if (!code) {
      throw new CheckoutInitializationError(
        `Unsupported currency "${currency}". Pass a numeric currency code or a supported ISO code.`
      );
    }

    return code;
  }
}
