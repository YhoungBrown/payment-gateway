import type { ProcessorConfig } from '@org/payment-gateway-core';
import { DefaultProcessorItem } from './components/DefaultProcessorItem';

interface PaymentProcessorSelectorProps {
  open: boolean;
  processors: ProcessorConfig[];
  onSelect: (processorId: string) => void;
  onCancel: () => void;
  title?: string;
  failedProcessorIds?: string[];
  timedOutProcessorIds?: string[];
  renderItem?: (props: {
    processor: ProcessorConfig;
    onSelect: () => void;
    isFailed: boolean;
    isTimedOut: boolean;
  }) => React.ReactNode;
}

export function PaymentProcessorSelector({
  open,
  processors,
  onSelect,
  onCancel,
  title = 'Select a payment method',
  failedProcessorIds = [],
  timedOutProcessorIds = [],
  renderItem,
}: PaymentProcessorSelectorProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        style={{
          background: '#fff',
          padding: 24,
          borderRadius: 12,
          minWidth: 320,
          maxWidth: '90vw',
        }}
      >
        <h2 style={{ marginTop: 0 }}>{title}</h2>
        <div>
          {processors.map((processor) => {
            const isFailed = failedProcessorIds.includes(processor.id);
            const isTimedOut = timedOutProcessorIds.includes(processor.id);
            return renderItem ? (
              <div key={processor.id}>
                {renderItem({
                  processor,
                  onSelect: () => onSelect(processor.id),
                  isFailed,
                  isTimedOut,
                })}
              </div>
            ) : (
              <DefaultProcessorItem
                key={processor.id}
                processor={processor}
                onSelect={() => onSelect(processor.id)}
                isFailed={isFailed}
                isTimedOut={isTimedOut}
              />
            );
          })}
        </div>
        <button
          type="button"
          onClick={onCancel}
          style={{
            marginTop: 16,
            padding: '10px 16px',
            width: '100%',
            border: '1px solid #ddd',
            borderRadius: 8,
            background: '#f5f5f5',
            cursor: 'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}