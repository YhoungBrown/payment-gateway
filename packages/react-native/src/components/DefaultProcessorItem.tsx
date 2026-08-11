import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
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
    <TouchableOpacity style={styles.button} onPress={onSelect}>
      <Text style={styles.text}>
        {processor.type.toUpperCase()}
        {processor.isDefault ? ' (default)' : ''}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 16,
  },
});
