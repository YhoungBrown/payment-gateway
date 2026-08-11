import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import type { ProcessorConfig } from '@org/payment-gateway-core';
import { DefaultProcessorItem } from './components/DefaultProcessorItem';

interface PaymentProcessorSelectorProps {
  open: boolean;
  processors: ProcessorConfig[];
  onSelect: (processorId: string) => void;
  onCancel: () => void;
  title?: string;
  renderItem?: (props: {
    processor: ProcessorConfig;
    onSelect: () => void;
  }) => React.ReactNode;
}

export function PaymentProcessorSelector({
  open,
  processors,
  onSelect,
  onCancel,
  title = 'Select a payment method',
  renderItem,
}: PaymentProcessorSelectorProps) {
  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView>
            {processors.map((processor) =>
              renderItem ? (
                <View key={processor.id}>
                  {renderItem({
                    processor,
                    onSelect: () => onSelect(processor.id),
                  })}
                </View>
              ) : (
                <DefaultProcessorItem
                  key={processor.id}
                  processor={processor}
                  onSelect={() => onSelect(processor.id)}
                />
              )
            )}
          </ScrollView>
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  cancelButton: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
  },
});
