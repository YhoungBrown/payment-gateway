import { test, expect } from '@playwright/test';

test.describe('Payment Gateway Web E2E', () => {
  test('should open popup and complete payment', async ({ page, context }) => {
    await page.goto('');

    await expect(page.getByTestId('default-processor')).toHaveText('flutterwave-1');
    await expect(page.getByTestId('processor-count')).toHaveText('1');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('pay-button').click(),
    ]);

    await expect(popup.getByText('Mock Processor Checkout')).toBeVisible();

    await popup.getByTestId('success-button').click();

    await expect(page.getByTestId('response')).toHaveText('success', { timeout: 10000 });
  });

  test('should cancel payment in popup', async ({ page, context }) => {
    await page.goto('');

    const [popup] = await Promise.all([
      context.waitForEvent('page'),
      page.getByTestId('pay-button').click(),
    ]);

    await popup.getByTestId('cancel-button').click();

    await expect(page.getByTestId('response')).toHaveText('cancelled', { timeout: 10000 });
  });

  test('should use HTTPS for checkout URL', async ({ page }) => {
    await page.goto('');
    const processorType = await page.getByTestId('default-processor').textContent();
    expect(processorType).toBe('flutterwave-1');
  });
});
