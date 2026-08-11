import React, { useCallback } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import WebViewBase from 'react-native-webview';
import type { WebViewProps } from 'react-native-webview';
import type { WebViewNavigation, WebViewSource } from 'react-native-webview/lib/WebViewTypes';
import {
  getAdapter,
  type InitializeResult,
  type PaymentResponse,
  type ProcessorConfig,
} from '@org/payment-gateway-core';

interface CheckoutWebViewProps {
  result: InitializeResult;
  processor: ProcessorConfig;
  onComplete: (response: PaymentResponse) => void;
  onCancel: () => void;
}

export function CheckoutWebView({
  result,
  processor,
  onComplete,
  onCancel,
}: CheckoutWebViewProps) {
  const WebView = WebViewBase as React.ComponentType<WebViewProps>;

  const handleNavigationStateChange = useCallback(
    (event: WebViewNavigation) => {
      const url = event.url;
      if (!url) return;

      if (processor.cancelUrl && url.startsWith(processor.cancelUrl)) {
        onCancel();
        return;
      }

      if (url.startsWith(processor.callbackUrl)) {
        const adapter = getAdapter(processor.type);
        const response = adapter.parseCallback(url, processor);
        onComplete(response);
      }
    },
    [processor, onComplete, onCancel]
  );

  const source: WebViewSource =
    result.method === 'POST' && result.postData
      ? {
          method: 'POST',
          uri: result.checkoutUrl,
          body: new URLSearchParams(result.postData).toString(),
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      : { uri: result.checkoutUrl };

  return (
    <Modal transparent={false} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.container}>
        <WebView
          source={source}
          onNavigationStateChange={handleNavigationStateChange}
          onError={() =>
            onComplete({
              status: 'failed',
              reference: '',
              processor: processor.type,
              message: 'WebView failed to load checkout',
            })
          }
          startInLoadingState
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
