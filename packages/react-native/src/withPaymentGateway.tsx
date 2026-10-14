import React from 'react';
import type {
  PaymentRequest,
  UsePaymentResult,
  UsePaymentProcessorsResult,
} from '@conitepay/core';
import { usePayment } from './usePayment';
import { usePaymentProcessors } from './usePaymentProcessors';

/**
 * Props injected by the `withPaymentGateway` higher-order component.
 *
 * Includes everything returned by `usePayment` and `usePaymentProcessors`.
 */
export type WithPaymentGatewayProps = UsePaymentResult &
  UsePaymentProcessorsResult;

/**
 * Higher-order component that lets class components use the payment gateway
 * without converting them to function components.
 *
 * The returned component requires a `request` prop and injects the payment API
 * as props.
 *
 * @example
 * ```tsx
 * class PaymentScreen extends React.Component<WithPaymentGatewayProps> {
 *   render() {
 *     const { pay, isProcessing, CheckoutView } = this.props;
 *     return (
 *       <View>
 *         <Button title="Pay" onPress={() => pay()} disabled={isProcessing} />
 *         {CheckoutView}
 *       </View>
 *     );
 *   }
 * }
 *
 * export default withPaymentGateway(PaymentScreen);
 * ```
 *
 * Then render it with a `request` prop:
 *
 * ```tsx
 * <PaymentScreen request={{ amount: 10000, currency: 'NGN', reference: 'ORDER-123', email: 'a@b.com' }} />
 * ```
 */
export function withPaymentGateway<P extends object>(
  WrappedComponent: React.ComponentType<P & WithPaymentGatewayProps>
): React.ComponentType<
  Omit<P, keyof WithPaymentGatewayProps> & { request: PaymentRequest }
> {
  return function WithPaymentGatewayComponent(
    props: Omit<P, keyof WithPaymentGatewayProps> & { request: PaymentRequest }
  ) {
    const { request, ...rest } = props;
    const payment = usePayment(request);
    const processors = usePaymentProcessors();

    return (
      <WrappedComponent
        {...(rest as P)}
        {...payment}
        {...processors}
      />
    );
  };
}
