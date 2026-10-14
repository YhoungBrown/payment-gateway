import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
} from 'react-native';
import type { ProcessorConfig } from '@conitepay/core';

interface DefaultProcessorItemProps {
  processor: ProcessorConfig;
  onSelect: () => void;
  isLoading?: boolean;
  isFailed?: boolean;
  isTimedOut?: boolean;
  activityIndicatorColor?: string;
}

export function DefaultProcessorItem({
  processor,
  onSelect,
  isLoading = false,
  isFailed = false,
  isTimedOut = false,
  activityIndicatorColor,
}: DefaultProcessorItemProps) {
  // Timed-out processors are NOT disabled — the user can retry them.
  const disabled = isLoading || (isFailed && !isTimedOut);
  const isUnavailable = isFailed && !isTimedOut;

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isUnavailable && styles.buttonFailed,
        isTimedOut && styles.buttonTimedOut,
      ]}
      onPress={onSelect}
      disabled={disabled}
      activeOpacity={disabled ? 1 : 0.2}
    >
      <View style={styles.content}>
        <View>
          <Text style={[styles.text, (isLoading || disabled) && styles.textFaded]}>
            {processor.type.toUpperCase()}
            {processor.isDefault ? ' (default)' : ''}
          </Text>
          {isUnavailable && (
            <Text style={styles.failedText}>Unavailable</Text>
          )}
          {isTimedOut && (
            <Text style={styles.timedOutText}>Timed out</Text>
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
  buttonTimedOut: {
    borderColor: '#ffe0b2',
    backgroundColor: '#fff3e0',
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
  timedOutText: {
    fontSize: 12,
    color: '#e65100',
    marginTop: 2,
  },
});