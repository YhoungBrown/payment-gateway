export class PaymentGatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentGatewayError';
  }
}

export class MissingConfigurationError extends PaymentGatewayError {
  constructor(message = 'No payment processors configured') {
    super(message);
    this.name = 'MissingConfigurationError';
  }
}

export class DuplicateDefaultProcessorError extends PaymentGatewayError {
  constructor(message = 'Only one processor can be marked as default') {
    super(message);
    this.name = 'DuplicateDefaultProcessorError';
  }
}

export class NoDefaultProcessorError extends PaymentGatewayError {
  constructor(message = 'No default processor configured') {
    super(message);
    this.name = 'NoDefaultProcessorError';
  }
}

export class ProcessorNotFoundError extends PaymentGatewayError {
  constructor(processorId: string) {
    super(`Processor with id "${processorId}" not found`);
    this.name = 'ProcessorNotFoundError';
  }
}

export class CheckoutInitializationError extends PaymentGatewayError {
  constructor(message = 'Failed to initialize checkout') {
    super(message);
    this.name = 'CheckoutInitializationError';
  }
}
