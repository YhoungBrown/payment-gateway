export interface Logger {
  log: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

export function createLogger(debug: boolean): Logger {
  const noop = () => {};

  if (!debug) {
    return { log: noop, warn: noop, error: noop };
  }

  return {
    log: (...args: unknown[]) => console.log('[PaymentGateway]', ...args),
    warn: (...args: unknown[]) => console.warn('[PaymentGateway]', ...args),
    error: (...args: unknown[]) => console.error('[PaymentGateway]', ...args),
  };
}

export function sanitizeUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveParams = ['token', 'access_code', 'secret', 'key', 'hash', 'signature'];
    sensitiveParams.forEach((param) => {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '***');
      }
    });
    return parsed.toString();
  } catch {
    return '[invalid-url]';
  }
}
