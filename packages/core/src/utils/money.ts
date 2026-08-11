import { PaymentGatewayError } from '../errors';

const ISO_4217_CURRENCY_REGEX = /^[A-Z]{3}$/;

export function validateAmount(amount: number): void {
  if (!Number.isInteger(amount)) {
    throw new PaymentGatewayError('Amount must be an integer in minor units');
  }
  if (amount < 0) {
    throw new PaymentGatewayError('Amount cannot be negative');
  }
}

export function validateCurrency(currency: string): void {
  if (!ISO_4217_CURRENCY_REGEX.test(currency)) {
    throw new PaymentGatewayError('Currency must be a valid ISO 4217 code');
  }
}

export function toMajorUnits(amount: number): number {
  return amount / 100;
}
