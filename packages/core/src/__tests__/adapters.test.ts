import { describe, it, expect } from 'vitest';
import { PaystackAdapter, FlutterwaveAdapter, InterswitchAdapter } from '../adapters';
import type { PaymentRequest, ProcessorConfig } from '../types';

const baseRequest: PaymentRequest = {
  amount: 10000,
  currency: 'NGN',
  reference: 'REF-123',
  email: 'test@example.com',
};

const baseProcessor: ProcessorConfig = {
  id: 'test',
  type: 'paystack',
  publicKey: 'pk_test',
  callbackUrl: 'https://example.com/callback',
};

describe('PaystackAdapter', () => {
  const adapter = new PaystackAdapter();

  it('should require initialize callback', async () => {
    await expect(
      adapter.initializeCheckout(baseRequest, baseProcessor)
    ).rejects.toThrow('Paystack checkout requires an initialize callback');
  });

  it.each([
    ['success', 'success'],
    ['successful', 'success'],
    ['failed', 'failed'],
    ['failure', 'failed'],
    ['abandoned', 'failed'],
    ['cancelled', 'cancelled'],
    ['canceled', 'cancelled'],
    ['', 'pending'],
    ['unknown', 'pending'],
  ])('should parse status "%s" as "%s"', (input, expected) => {
    const response = adapter.parseCallback(
      `https://example.com/callback?reference=REF-123&trxref=TRX-456&status=${input}`,
      baseProcessor
    );
    expect(response.status).toBe(expected);
    expect(response.reference).toBe('REF-123');
    expect(response.processorReference).toBe('TRX-456');
    expect(response.processor).toBe('paystack');
  });
});

describe('FlutterwaveAdapter', () => {
  const adapter = new FlutterwaveAdapter();
  const flutterwaveProcessor: ProcessorConfig = {
    ...baseProcessor,
    type: 'flutterwave',
  };

  it('should require initialize callback', async () => {
    await expect(
      adapter.initializeCheckout(baseRequest, flutterwaveProcessor)
    ).rejects.toThrow('Flutterwave checkout requires an initialize callback');
  });

  it.each([
    ['successful', 'success'],
    ['cancelled', 'cancelled'],
    ['failed', 'failed'],
    ['unknown', 'pending'],
  ])('should parse status "%s" as "%s"', (input, expected) => {
    const response = adapter.parseCallback(
      `https://example.com/callback?status=${input}&tx_ref=REF-123&transaction_id=TRX-456`,
      flutterwaveProcessor
    );
    expect(response.status).toBe(expected);
    expect(response.reference).toBe('REF-123');
    expect(response.processorReference).toBe('TRX-456');
    expect(response.processor).toBe('flutterwave');
  });
});

describe('InterswitchAdapter', () => {
  const adapter = new InterswitchAdapter();
  const interswitchProcessor: ProcessorConfig = {
    ...baseProcessor,
    type: 'interswitch',
    endpoint: 'https://sandbox.interswitchng.com/collections/w/pay',
    merchantCode: 'MX6072',
    payItemId: '9405967',
    payItemName: 'Test Item',
  };

  it('should build a POST checkout without initialize callback', async () => {
    const result = await adapter.initializeCheckout(baseRequest, interswitchProcessor);
    expect(result.method).toBe('POST');
    expect(result.checkoutUrl).toBe('https://sandbox.interswitchng.com/collections/w/pay');
    expect(result.postData).toBeDefined();
    expect(result.postData?.merchant_code).toBe('MX6072');
    expect(result.postData?.pay_item_id).toBe('9405967');
    expect(result.postData?.pay_item_name).toBe('Test Item');
    expect(result.postData?.txn_ref).toBe('REF-123');
    expect(result.postData?.amount).toBe('10000');
    expect(result.postData?.currency).toBe('566');
    expect(result.postData?.site_redirect_url).toBe('https://example.com/callback');
    expect(result.postData?.hash).toBeUndefined();
  });

  it('should throw when endpoint is missing for client-side checkout', async () => {
    const processorWithoutEndpoint: ProcessorConfig = {
      ...interswitchProcessor,
      endpoint: undefined,
    };
    await expect(
      adapter.initializeCheckout(baseRequest, processorWithoutEndpoint)
    ).rejects.toThrow('Interswitch checkout requires an endpoint');
  });

  it('should throw when merchantCode or payItemId is missing', async () => {
    const processorWithoutMerchant: ProcessorConfig = {
      ...interswitchProcessor,
      merchantCode: undefined,
    };
    await expect(
      adapter.initializeCheckout(baseRequest, processorWithoutMerchant)
    ).rejects.toThrow('Interswitch checkout requires merchantCode');
  });

  it.each([
    ['00', 'success'],
    ['99', 'failed'],
    ['', 'pending'],
  ])('should parse resp code "%s" as "%s"', (resp, expected) => {
    const response = adapter.parseCallback(
      `https://example.com/callback?txnref=REF-123&resp=${resp}&desc=Test&retRef=RET-123`,
      interswitchProcessor
    );
    expect(response.status).toBe(expected);
    expect(response.reference).toBe('REF-123');
    expect(response.processorReference).toBe('RET-123');
    expect(response.processor).toBe('interswitch');
  });
});
