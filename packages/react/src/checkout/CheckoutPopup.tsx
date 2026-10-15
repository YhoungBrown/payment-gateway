import {
  getAdapter,
  type InitializeResult,
  type PaymentResponse,
  type ProcessorConfig,
} from '@conitepay/core';

export async function launchCheckoutPopup(
  result: InitializeResult,
  processor: ProcessorConfig
): Promise<PaymentResponse> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    let popup: Window | null = null;

    if (result.method === 'POST' && result.postData) {
      popup = window.open(
        '',
        '_blank',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } else {
      popup = window.open(
        result.checkoutUrl,
        '_blank',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    }

    if (!popup || popup.closed) {
      if (result.method === 'POST' && result.postData) {
        submitFormRedirect(result.checkoutUrl, result.postData);
      } else {
        window.location.href = result.checkoutUrl;
      }
      reject(new Error('Popup blocked; falling back to redirect'));
      return;
    }

    if (result.method === 'POST' && result.postData) {
      writePostForm(popup, result.checkoutUrl, result.postData);
    }

    let interval: number | undefined;
    let settled = false;
    let reachedCallback = false;

    const cleanup = () => {
      if (interval !== undefined) {
        window.clearInterval(interval);
      }

      try {
        popup?.removeEventListener('load', checkCallbackUrl);
      } catch {
        // Cross-origin popup access may prevent removing the listener.
      }
    };

    const checkCallbackUrl = () => {
      if (settled) return;

      try {
        if (!popup || popup.closed) {
          settled = true;
          cleanup();

          // If the popup closed without ever reaching the callback URL,
          // the user intentionally closed the window. Report it as cancelled
          // so the SDK reopens the selector without marking the processor
          // as unavailable.
          if (!reachedCallback) {
            resolve({
              status: 'cancelled',
              reference: '',
              processor: processor.type,
              message: 'Checkout window closed by user',
            });
            return;
          }

          resolve({
            status: 'cancelled',
            reference: '',
            processor: processor.type,
            message: 'Checkout window closed by user',
          });
          return;
        }

        const callbackUrl = popup.location.href;
        if (isCallbackUrl(callbackUrl, processor.callbackUrl)) {
          reachedCallback = true;
          settled = true;
          cleanup();
          popup.close();

          try {
            const adapter = getAdapter(processor.type);
            const response = adapter.parseCallback(callbackUrl, processor);

            // Let the browser process the popup close before resolving. In
            // particular, cancelled callbacks skip backend verification, so the
            // caller may otherwise immediately show a blocking alert that delays
            // Chrome's visible close of the popup.
            window.setTimeout(() => resolve(response), 0);
          } catch (error) {
            reject(error instanceof Error ? error : new Error(String(error)));
          }
        }
      } catch {
        // Cross-origin URLs throw until the popup reaches the callback origin.
      }
    };

    // Listen for navigations that load the callback page, so we can react as
    // soon as the popup reaches our origin instead of waiting for the poll.
    // Some browsers restrict event access on a cross-origin WindowProxy, so
    // the short polling interval below remains the reliable fallback.
    try {
      popup.addEventListener('load', checkCallbackUrl);
    } catch {
      // Fall back to polling when the browser blocks cross-origin access.
    }

    interval = window.setInterval(checkCallbackUrl, 100);
  });
}

function isCallbackUrl(currentUrl: string, callbackUrl: string): boolean {
  try {
    const current = new URL(currentUrl);
    const callback = new URL(callbackUrl);
    const normalizePath = (pathname: string) =>
      pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;

    // Processor callbacks append query parameters (including status/reference),
    // so identify the configured callback by origin and path, not full URL text.
    return (
      current.origin === callback.origin &&
      normalizePath(current.pathname) === normalizePath(callback.pathname)
    );
  } catch {
    return false;
  }
}

function writePostForm(
  popup: Window,
  action: string,
  postData: Record<string, string>
): void {
  const form = popup.document.createElement('form');
  form.method = 'POST';
  form.action = action;
  Object.entries(postData).forEach(([name, value]) => {
    const input = popup.document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  popup.document.body.appendChild(form);
  form.submit();
}

function submitFormRedirect(
  action: string,
  postData: Record<string, string>
): void {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = action;
  Object.entries(postData).forEach(([name, value]) => {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}
