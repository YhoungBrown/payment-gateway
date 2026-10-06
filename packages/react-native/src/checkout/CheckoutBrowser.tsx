import React, { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { InAppBrowser } from 'react-native-inappbrowser-reborn';
import type {
  InitializeResult,
  PaymentResponse,
  ProcessorConfig,
} from '@org/payment-gateway-core';
import { CheckoutWebView } from './CheckoutWebView';

interface CheckoutBrowserProps {
  result: InitializeResult;
  processor: ProcessorConfig;
  reference: string;
  debug?: boolean;
  verifyHookProvided: boolean;
  onComplete: (response: PaymentResponse) => void;
  onCancel: () => void;
}

export function CheckoutBrowser({
  result,
  processor,
  reference,
  verifyHookProvided,
  onComplete,
  onCancel,
}: CheckoutBrowserProps) {
  const [fallbackToWebView, setFallbackToWebView] = useState(false);
  const launchedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (launchedRef.current) {
      return;
    }
    launchedRef.current = true;

    const launchBrowser = async () => {
      try {
        const isAvailable = await InAppBrowser.isAvailable();
        if (!isAvailable) {
          if (mountedRef.current) setFallbackToWebView(true);
          return;
        }

        if (result.method !== 'GET') {
          if (mountedRef.current) setFallbackToWebView(true);
          return;
        }

        const options = {
          dismissButtonStyle: 'close' as const,
          modalEnabled: true,
          showTitle: true,
          toolbarColor: '#6200EE',
          enableUrlBarHiding: true,
          forceCloseOnRedirection: false,
        };

        if (Platform.OS === 'android') {
          await InAppBrowser.openAuth(
            result.checkoutUrl,
            processor.callbackUrl,
            options
          );
        } else {
          await InAppBrowser.open(result.checkoutUrl, options);
        }

        if (!mountedRef.current) {
          return;
        }

        // The Interswitch redirect parameters must not be trusted (per Interswitch docs).
        // We always report pending and let the merchant's verify hook determine the
        // authoritative status. If no verify hook is configured, we cannot safely
        // determine the outcome, so treat it as cancelled.
        if (verifyHookProvided) {
          onComplete({
            status: 'pending',
            reference,
            processor: processor.type,
            message: 'Checkout completed in browser; awaiting verification',
          });
        } else {
          onCancel();
        }
      } catch (error) {
        if (mountedRef.current) {
          setFallbackToWebView(true);
        }
      }
    };

    launchBrowser();
  }, [
    result,
    processor,
    reference,
    verifyHookProvided,
    onComplete,
    onCancel,
  ]);

  if (fallbackToWebView) {
    return (
      <CheckoutWebView
        result={result}
        processor={processor}
        onComplete={onComplete}
        onCancel={onCancel}
      />
    );
  }

  // The browser is opened as a system modal from the side effect.
  // Nothing needs to be rendered in the React tree.
  return null;
}
