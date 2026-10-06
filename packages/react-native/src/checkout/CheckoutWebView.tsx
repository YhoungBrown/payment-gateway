import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewNavigation,
  WebViewOpenWindowEvent,
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
  const hasLoadedRef = useRef(false);

  const handleLoad = useCallback(() => {
    hasLoadedRef.current = true;
  }, []);

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
      // If the checkout already loaded, this error is from the user
      // closing the WebView or an aborted navigation — not a processor failure.
      if (hasLoadedRef.current) return;
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
      // If the checkout already loaded, this HTTP error is from the user
      // closing the WebView or an aborted navigation — not a processor failure.
      if (hasLoadedRef.current) return;
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

  const handleOpenWindow = useCallback((event: WebViewOpenWindowEvent) => {
    const targetUrl = (event.nativeEvent as any)?.targetUrl as
      | string
      | undefined;
    if (targetUrl) {
      setCurrentSource({ uri: targetUrl });
    }
  }, []);

  const initialSource: WebViewSource =
    result.method === 'POST' && result.postData
      ? {
          method: 'POST',
          uri: result.checkoutUrl,
          body: new URLSearchParams(result.postData).toString(),
        }
      : { uri: result.checkoutUrl };

  const [currentSource, setCurrentSource] =
    useState<WebViewSource>(initialSource);

  useEffect(() => {
    setCurrentSource(initialSource);
  }, [initialSource]);

  return (
    <Modal
      transparent={false}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        <WebView
          source={currentSource}
          style={styles.webView}
          onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
          onNavigationStateChange={handleNavigationStateChange}
          onError={handleError}
          onHttpError={handleHttpError}
          onLoad={handleLoad}
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows
          onOpenWindow={handleOpenWindow}
          userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
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
