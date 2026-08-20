export type ProcessorType = 'paystack' | 'flutterwave' | 'webpay';

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
  productId?: string;
  payItemId?: string;
  macKey?: string;
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
  isProcessing: boolean;
  isSelecting: boolean;
  activeProcessorId?: string;
  error: Error | null;
  reset: () => void;
}

export interface UsePaymentProcessorsResult {
  processors: ProcessorConfig[];
  defaultProcessor: ProcessorConfig | undefined;
}
