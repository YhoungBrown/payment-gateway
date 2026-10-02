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
  isFailed?: boolean;
  activityIndicatorColor?: string;
}

export function DefaultProcessorItem({
  processor,
  onSelect,
  isLoading = false,
  isFailed = false,
  activityIndicatorColor,
}: DefaultProcessorItemProps) {
  return (
    <TouchableOpacity
      style={[styles.button, isFailed && styles.buttonFailed]}
      onPress={onSelect}
      disabled={isLoading || isFailed}
      activeOpacity={isLoading || isFailed ? 1 : 0.2}
    >
      <View style={styles.content}>
        <View>
          <Text style={[styles.text, isLoading && styles.textFaded]}>
            {processor.type.toUpperCase()}
            {processor.isDefault ? ' (default)' : ''}
          </Text>
          {isFailed && (
            <Text style={styles.failedText}>Unavailable</Text>
          )}
        </View>
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
  buttonFailed: {
    opacity: 0.6,
    borderColor: '#ffcdd2',
    backgroundColor: '#ffebee',
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
  failedText: {
    fontSize: 12,
    color: '#c62828',
    marginTop: 2,
  },
});
