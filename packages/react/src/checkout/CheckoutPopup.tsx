import {
  getAdapter,
  type InitializeResult,
  type PaymentResponse,
  type ProcessorConfig,
} from '@org/payment-gateway-core';

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

    const interval = window.setInterval(() => {
      try {
        if (!popup || popup.closed) {
          clearInterval(interval);
          resolve({
            status: 'cancelled',
            reference: '',
            processor: processor.type,
            message: 'Checkout window closed by user',
          });
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl && popupUrl.startsWith(processor.callbackUrl)) {
          clearInterval(interval);
          popup.close();
          const adapter = getAdapter(processor.type);
          const response = adapter.parseCallback(popupUrl, processor);
          resolve(response);
        }
      } catch {
        // Cross-origin URLs will throw until same-origin callback
      }
    }, 500);
  });
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
