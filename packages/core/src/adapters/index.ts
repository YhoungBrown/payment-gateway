import type { ProcessorType } from '../types';
import { PaystackAdapter } from './paystack';
import { FlutterwaveAdapter } from './flutterwave';
import { InterswitchAdapter } from './interswitch';
import type { PaymentAdapter } from './base';

const adapters: Record<ProcessorType, () => PaymentAdapter> = {
  paystack: () => new PaystackAdapter(),
  flutterwave: () => new FlutterwaveAdapter(),
  interswitch: () => new InterswitchAdapter(),
};

export function getAdapter(type: ProcessorType): PaymentAdapter {
  const factory = adapters[type];
  if (!factory) {
    throw new Error(`Unsupported processor type: ${type}`);
  }
  return factory();
}

export { PaystackAdapter, FlutterwaveAdapter, InterswitchAdapter };
export type { PaymentAdapter };
