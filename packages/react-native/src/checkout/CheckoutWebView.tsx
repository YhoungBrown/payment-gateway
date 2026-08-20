import React, { useCallback } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewNavigation,
  WebViewSource,
} from 'react-native-webview/lib/WebViewTypes';
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
  const handleCallbackUrl = useCallback(
    (url: string) => {
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

  const handleShouldStartLoadWithRequest = useCallback(
    (event: WebViewNavigation) => {
      const url = event.url;
      if (!url) return true;

      const isCancelUrl =
        processor.cancelUrl && url.startsWith(processor.cancelUrl);
      const isCallbackUrl = url.startsWith(processor.callbackUrl);

      if (isCancelUrl || isCallbackUrl) {
        handleCallbackUrl(url);
        return false;
      }

      return true;
    },
    [processor, handleCallbackUrl]
  );

  const handleNavigationStateChange = useCallback(
    (event: WebViewNavigation) => {
      const url = event.url;
      if (!url) return;
      handleCallbackUrl(url);
    },
    [handleCallbackUrl]
  );

  const handleError = useCallback(
    (event: WebViewErrorEvent) => {
      const description =
        (event.nativeEvent as any)?.description ||
        'WebView failed to load checkout';
      onComplete({
        status: 'failed',
        reference: '',
        processor: processor.type,
        message: description,
      });
    },
    [processor, onComplete]
  );

  const handleHttpError = useCallback(
    (event: WebViewHttpErrorEvent) => {
      const nativeEvent = event.nativeEvent as any;
      const description =
        nativeEvent?.description ||
        `HTTP error ${nativeEvent?.statusCode || ''}`;
      onComplete({
        status: 'failed',
        reference: '',
        processor: processor.type,
        message: description,
      });
    },
    [processor, onComplete]
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
    <Modal
      transparent={false}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <WebView
          source={source}
          style={styles.webView}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onHttpError={handleHttpError}
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
  webView: {
    flex: 1,
  },
});
