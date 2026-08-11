import type {
  InitializeResult,
  PaymentRequest,
  PaymentResponse,
  ProcessorConfig,
} from '../types';
import type { PaymentAdapter } from './base';
import { CheckoutInitializationError } from '../errors';
import { createSha512Hash } from '../utils/hash';
import { buildCallbackResponse } from './base';

export class WebpayAdapter implements PaymentAdapter {
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

    const { endpoint, productId, payItemId, macKey, callbackUrl } = processor;
    if (!endpoint) {
      throw new CheckoutInitializationError(
        'Webpay client-side checkout requires an endpoint. Pass it in ProcessorConfig.endpoint or provide an initialize callback.'
      );
    }
    if (!productId || !payItemId || !macKey || !callbackUrl) {
      throw new CheckoutInitializationError(
        'Webpay client-side checkout requires productId, payItemId, macKey, callbackUrl, and endpoint.'
      );
    }

    const currency = this.mapCurrencyToNumeric(request.currency);
    const hash = createSha512Hash(
      `${request.reference}${productId}${payItemId}${request.amount}${callbackUrl}${macKey}`
    );

    const postData: Record<string, string> = {
      product_id: productId,
      pay_item_id: payItemId,
      currency,
      site_redirect_url: callbackUrl,
      txn_ref: request.reference,
      amount: String(request.amount),
      hash,
      cust_name: (request.metadata?.customerName as string) || request.email,
      cust_id: (request.metadata?.customerId as string) || request.email,
    };

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
    const processorReference = parsedUrl.searchParams.get('payRef') || undefined;

    const status: PaymentResponse['status'] =
      responseCode === '00' ? 'success' : responseCode ? 'failed' : 'pending';

    return buildCallbackResponse(
      status,
      reference,
      processor,
      processorReference,
      description
    );
  }

  private mapCurrencyToNumeric(currency: string): string {
    const map: Record<string, string> = {
      NGN: '566',
    };
    return map[currency.toUpperCase()] || currency;
  }
}
