import {
  PaymentGatewayProvider as CoreProvider,
  type PaymentGatewayProviderProps,
} from '@org/payment-gateway-core';

export function PaymentGatewayProvider({ config, children }: PaymentGatewayProviderProps) {
  return <CoreProvider config={config}>{children}</CoreProvider>;
}
