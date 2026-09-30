import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type {
  WebViewErrorEvent,
  WebViewHttpErrorEvent,
  WebViewMessageEvent,
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

// TODO: remove diagnostic scripts after cookie banner issue is resolved
const diagnosticScriptBeforeContentLoaded = `(function(){
  function postToRN(payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  if (!window.opener || window.opener._ipgMock) {
    window.opener = {
      _ipgMock: true,
      closed: false,
      self: window,
      top: window,
      parent: window,
      location: {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash
      },
      postMessage: function(message, targetOrigin) {
        postToRN({ source: 'opener-postMessage', message: String(message), targetOrigin: targetOrigin });
      },
      addEventListener: function(type, listener, options) {
        postToRN({ source: 'opener-addEventListener', type: type });
        window.addEventListener(type, listener, options);
      },
      removeEventListener: window.removeEventListener.bind(window)
    };
  }
  window.addEventListener('message', function(event) {
    postToRN({ source: 'window-message', data: String(event.data), origin: event.origin });
  });
  window.addEventListener('error', function(event) {
    postToRN({ source: 'window-error', message: event.message, filename: event.filename, lineno: event.lineno, colno: event.colno, error: String(event.error) });
  });
  var originalLog = console.log;
  console.log = function() {
    var args = Array.prototype.slice.call(arguments);
    postToRN({ source: 'console-log', args: args.map(function(a){ return String(a); }) });
    originalLog.apply(console, arguments);
  };
  var originalError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    postToRN({ source: 'console-error', args: args.map(function(a){ return String(a); }) });
    originalError.apply(console, arguments);
  };
})();`;

// TODO: remove diagnostic scripts after cookie banner issue is resolved
const diagnosticScript = `(function(){
  function postToRN(payload) {
    if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }
  }
  var report = { source: 'page-info', url: window.location.href, userAgent: navigator.userAgent, hasOpener: !!window.opener, openerIsMock: !!(window.opener && window.opener._ipgMock) };
  try { report.globalKeys = Object.keys(window).filter(function(k){ return typeof window[k] === 'function'; }).slice(0, 100); } catch(e){}
  try {
    if (window.IpgApp) {
      report.ipgAppKeys = Object.keys(window.IpgApp);
      report.displayModeType = window.IpgApp.displayModeType;
      report.paymentId = window.IpgApp.paymentId;
    }
  } catch(e){}
  var consentContainer = document.querySelector('.consent-container');
  var acceptBtn = document.querySelector('.accept-btn');
  var readBtn = document.querySelector('.read-btn');
  var appView = document.getElementById('AppView');
  report.consentContainerExists = !!consentContainer;
  report.acceptBtnExists = !!acceptBtn;
  report.readBtnExists = !!readBtn;
  report.appViewExists = !!appView;
  if (appView) {
    report.appViewHtmlLength = appView.innerHTML.length;
  }
  if (acceptBtn) {
    report.acceptBtnText = acceptBtn.textContent;
    report.acceptBtnOnclick = typeof acceptBtn.onclick;
    report.acceptBtnDataset = acceptBtn.dataset ? Object.keys(acceptBtn.dataset) : [];
  }
  postToRN(report);
  if (acceptBtn) {
    acceptBtn.addEventListener('click', function(e) {
      postToRN({ source: 'accept-clicked', url: window.location.href, defaultPrevented: e.defaultPrevented, target: e.target.outerHTML });
    });
  }
  if (readBtn) {
    readBtn.addEventListener('click', function(e) {
      postToRN({ source: 'read-clicked', url: window.location.href, defaultPrevented: e.defaultPrevented, target: e.target.outerHTML });
    });
  }
  if (appView) {
    var observer = new MutationObserver(function(mutations) {
      postToRN({ source: 'appview-mutation', htmlLength: appView.innerHTML.length, summary: mutations.map(function(m){ return m.type + ':' + (m.target.id || m.target.className || m.target.tagName); }).join(', ') });
    });
    observer.observe(appView, { childList: true, subtree: true });
  }
})();`;

export function CheckoutWebView({
  result,
  processor,
  onComplete,
  onCancel,
}: CheckoutWebViewProps) {
  const handleCallbackUrl = useCallback(
    (url: string) => {
      // TODO: remove debug log after cookie banner issue is resolved
      console.log('[CheckoutWebView] handleCallbackUrl', url);

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
      // TODO: remove debug log after cookie banner issue is resolved
      console.log('[CheckoutWebView] shouldStartLoadWithRequest', url);
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
      // TODO: remove debug log after cookie banner issue is resolved
      console.log('[CheckoutWebView] navigationStateChange', url);
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

  const handleOpenWindow = useCallback((event: WebViewOpenWindowEvent) => {
    // TODO: remove debug log after cookie banner issue is resolved
    console.log('[CheckoutWebView] openWindow', event.nativeEvent);
    const targetUrl = (event.nativeEvent as any)?.targetUrl as
      | string
      | undefined;
    if (targetUrl) {
      setCurrentSource({ uri: targetUrl });
    }
  }, []);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    // TODO: remove debug log after cookie banner issue is resolved
    console.log('[CheckoutWebView] message', event.nativeEvent?.data);
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
          startInLoadingState
          javaScriptEnabled
          domStorageEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows
          onOpenWindow={handleOpenWindow}
          onMessage={handleMessage}
          userAgent="Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36"
          injectedJavaScriptBeforeContentLoaded={diagnosticScriptBeforeContentLoaded}
          injectedJavaScript={diagnosticScript}
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
