import React from 'react';
import {
  PaymentGatewayProvider as CoreProvider,
  type PaymentGatewayProviderProps,
} from '@conitepay/core';

export function PaymentGatewayProvider({
  config,
  children,
}: PaymentGatewayProviderProps) {
  return <CoreProvider config={config}>{children}</CoreProvider>;
}
