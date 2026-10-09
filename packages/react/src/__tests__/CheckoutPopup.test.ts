import { afterEach, describe, expect, it, vi } from 'vitest';
import { launchCheckoutPopup } from '../checkout/CheckoutPopup';
import type { ProcessorConfig } from '@org/payment-gateway-core';

function createPopup(initialUrl: string) {
  const listeners = new Map<string, EventListener>();
  const popup = {
    location: { href: initialUrl },
    closed: false,
    close: vi.fn(),
    addEventListener: vi.fn((type: string, listener: EventListener) => {
      listeners.set(type, listener);
    }),
    removeEventListener: vi.fn((type: string) => {
      listeners.delete(type);
    }),
  } as unknown as Window;

  return { popup, listeners };
}

describe('launchCheckoutPopup', () => {
  const originalOpen = window.open;

  afterEach(() => {
    window.open = originalOpen;
    vi.useRealTimers();
  });

  it('closes the popup and returns cancelled for Flutterwave cancellation callback', async () => {
    vi.useFakeTimers();
    const callbackUrl = 'https://shop.example.com/flutterwave-callback';
    const processor: ProcessorConfig = {
      id: 'flutterwave-1',
      type: 'flutterwave',
      callbackUrl,
    };
    const { popup, listeners } = createPopup('https://checkout.flutterwave.com');
    window.open = vi.fn().mockReturnValue(popup);

    const payment = launchCheckoutPopup(
      { checkoutUrl: 'https://checkout.flutterwave.com/payment' },
      processor
    );

    (popup.location as Location).href =
      `${callbackUrl}?status=cancelled&tx_ref=REF-123`;
    listeners.get('load')?.(new Event('load'));
    expect(popup.close).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(0);

    await expect(payment).resolves.toMatchObject({
      status: 'cancelled',
      reference: 'REF-123',
      processor: 'flutterwave',
    });
    expect(popup.removeEventListener).toHaveBeenCalledWith(
      'load',
      expect.any(Function)
    );
  });

  it('uses polling as a fallback and continues to parse successful callbacks', async () => {
    vi.useFakeTimers();
    const callbackUrl = 'https://shop.example.com/callback';
    const processor: ProcessorConfig = {
      id: 'paystack-1',
      type: 'paystack',
      callbackUrl,
    };
    const { popup, listeners } = createPopup('https://checkout.paystack.com');
    window.open = vi.fn().mockReturnValue(popup);

    const payment = launchCheckoutPopup(
      { checkoutUrl: 'https://checkout.paystack.com/payment' },
      processor
    );

    (popup.location as Location).href = `${callbackUrl}/?reference=REF-456&status=success`;
    listeners.get('load')?.(new Event('load'));
    await vi.advanceTimersByTimeAsync(0);

    await expect(payment).resolves.toMatchObject({
      status: 'success',
      reference: 'REF-456',
      processor: 'paystack',
    });
    expect(popup.close).toHaveBeenCalledOnce();
  });
});
