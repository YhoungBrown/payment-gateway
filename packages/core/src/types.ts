export type ProcessorType = 'paystack' | 'flutterwave' | 'interswitch';

export interface VerificationResult {
  verified: boolean;
  message?: string;
  data?: unknown;
}

export interface ProcessorConfig {
  id: string;
  type: ProcessorType;
  isDefault?: boolean;
  publicKey?: string;
  callbackUrl: string;
  cancelUrl?: string;
  endpoint?: string;
  subaccount?: string;
  splitCode?: string;
  merchantCode?: string;
  payItemId?: string;
  payItemName?: string;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  reference: string;
  email: string;
  metadata?: Record<string, unknown>;
}

export type PaymentStatus = 'success' | 'cancelled' | 'failed' | 'pending';

export interface PaymentResponse {
  status: PaymentStatus;
  reference: string;
  processor: ProcessorType;
  processorReference?: string;
  message?: string;
}

export interface InitializeResult {
  checkoutUrl: string;
  method?: 'GET' | 'POST';
  postData?: Record<string, string>;
}

export interface PaymentGatewayConfig {
  processors: ProcessorConfig[];
  debug?: boolean;
  /**
   * Maximum time (in milliseconds) to wait for a processor to return a checkout URL
   * during initialization. Defaults to 20_000 ms when not provided.
   */
  initializeTimeoutMs?: number;
  initialize?: (
    request: PaymentRequest,
    processor: ProcessorConfig
  ) => Promise<InitializeResult | undefined>;
  verify?: (response: PaymentResponse) => Promise<VerificationResult>;
}

export interface UsePaymentResult {
  pay: () => Promise<PaymentResponse>;
  selectProcessor: (processorId: string) => Promise<PaymentResponse>;
  cancelSelection: () => void;
  CheckoutView: React.ReactNode | null;
  isProcessing: boolean;
  isSelecting: boolean;
  showProcessorSelector: boolean;
  activeProcessorId?: string;
  hasActiveProcessorId: boolean;
  wasCheckoutMounted?: boolean;
  failedProcessorIds: string[];
  timedOutProcessorIds: string[];
  response?: PaymentResponse;
  error: Error | null;
  reset: () => void;
}

export interface UsePaymentProcessorsResult {
  processors: ProcessorConfig[];
  defaultProcessor: ProcessorConfig | undefined;
}
