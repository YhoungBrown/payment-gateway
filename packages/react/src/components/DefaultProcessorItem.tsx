import type { ProcessorConfig } from '@org/payment-gateway-core';

interface DefaultProcessorItemProps {
  processor: ProcessorConfig;
  onSelect: () => void;
}

export function DefaultProcessorItem({
  processor,
  onSelect,
}: DefaultProcessorItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        padding: '12px 16px',
        margin: '8px 0',
        width: '100%',
        textAlign: 'left',
        border: '1px solid #ddd',
        borderRadius: '8px',
        background: '#fff',
        cursor: 'pointer',
      }}
    >
      <strong>{processor.type.toUpperCase()}</strong>
      {processor.isDefault && (
        <span style={{ marginLeft: 8, color: '#666' }}>(default)</span>
      )}
    </button>
  );
}
