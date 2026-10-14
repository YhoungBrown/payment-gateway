import type { ProcessorConfig } from '@conitepay/core';

interface DefaultProcessorItemProps {
  processor: ProcessorConfig;
  onSelect: () => void;
  isFailed?: boolean;
  isTimedOut?: boolean;
}

export function DefaultProcessorItem({
  processor,
  onSelect,
  isFailed = false,
  isTimedOut = false,
}: DefaultProcessorItemProps) {
  const disabled = isFailed;
  // Timed-out processors are NOT disabled — the user can retry them.
  const isUnavailable = isFailed && !isTimedOut;

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      style={{
        padding: '12px 16px',
        margin: '8px 0',
        width: '100%',
        textAlign: 'left',
        border: '1px solid #ddd',
        borderRadius: '8px',
        background: isUnavailable ? '#ffebee' : '#fff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <strong>{processor.type.toUpperCase()}</strong>
      {processor.isDefault && (
        <span style={{ marginLeft: 8, color: '#666' }}>(default)</span>
      )}
      {isUnavailable && (
        <span style={{ marginLeft: 8, color: '#c62828', fontSize: 14 }}>
          Unavailable
        </span>
      )}
      {isTimedOut && (
        <span style={{ marginLeft: 8, color: '#e65100', fontSize: 14 }}>
          Timed out
        </span>
      )}
    </button>
  );
}