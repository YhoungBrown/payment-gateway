import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import type { ProcessorConfig } from '@org/payment-gateway-core';

interface DefaultProcessorItemProps {
  processor: ProcessorConfig;
  onSelect: () => void;
  isLoading?: boolean;
  activityIndicatorColor?: string;
}

export function DefaultProcessorItem({
  processor,
  onSelect,
  isLoading = false,
  activityIndicatorColor,
}: DefaultProcessorItemProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onSelect}
      disabled={isLoading}
      activeOpacity={isLoading ? 1 : 0.2}
    >
      <View style={styles.content}>
        <Text style={[styles.text, isLoading && styles.textFaded]}>
          {processor.type.toUpperCase()}
          {processor.isDefault ? ' (default)' : ''}
        </Text>
        {isLoading && (
          <ActivityIndicator color={activityIndicatorColor} />
        )}
      </View>
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
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 16,
  },
  textFaded: {
    opacity: 0.6,
  },
});
