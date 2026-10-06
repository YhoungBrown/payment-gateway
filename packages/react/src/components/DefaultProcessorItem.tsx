import type { ProcessorConfig } from '@org/payment-gateway-core';

interface DefaultProcessorItemProps {
  processor: ProcessorConfig;
  onSelect: () => void;
  isFailed?: boolean;
}

export function DefaultProcessorItem({
  processor,
  onSelect,
  isFailed = false,
}: DefaultProcessorItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isFailed}
      style={{
        padding: '12px 16px',
        margin: '8px 0',
        width: '100%',
        textAlign: 'left',
        border: '1px solid #ddd',
        borderRadius: '8px',
        background: isFailed ? '#ffebee' : '#fff',
        cursor: isFailed ? 'not-allowed' : 'pointer',
        opacity: isFailed ? 0.6 : 1,
      }}
    >
      <strong>{processor.type.toUpperCase()}</strong>
      {processor.isDefault && (
        <span style={{ marginLeft: 8, color: '#666' }}>(default)</span>
      )}
      {isFailed && (
        <span style={{ marginLeft: 8, color: '#c62828', fontSize: 14 }}>
          Unavailable
        </span>
      )}
    </button>
  );
}
