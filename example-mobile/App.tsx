/**
 * This is the official example app for @conitepay/react-native.
 * It uses Paystack, Flutterwave, and Interswitch.
 * It points to a demo backend by default.
 * To run with your own backend, change baseUrl.
 */

import React, { useEffect, useState } from 'react';
import {
  Alert,
  //Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  PaymentGatewayProvider,
  usePayment,
  usePaymentProcessors,
  PaymentProcessorSelector,
  type PaymentGatewayConfig,
  type PaymentRequest,
  type PaymentResponse,
  //type ProcessorConfig,
} from '@conitepay/react-native';
import BootSplash from 'react-native-bootsplash';

// Interswitch Web Checkout sandbox credentials (client-side form fields).
// Get these from your Interswitch dashboard and set them in your .env file.
// See .env for the required variables.
import {
  INTERSWITCH_ENDPOINT,
  INTERSWITCH_MERCHANT_CODE,
  INTERSWITCH_PAY_ITEM_ID,
  INTERSWITCH_PAY_ITEM_NAME,
} from '@env';

// =============================================================================
// CONFIGURATION
// =============================================================================

// Callback URLs used by the processors. The SDK intercepts these URLs in the WebView.
// IMPORTANT: these must match the callback URLs configured in your backend. so replace them with your backend callback URLs if you are using your own backend. The example backend is deployed at https://paymentgateway-example-backend.vercel.app
const PAYSTACK_CALLBACK_URL =
  'https://paymentgateway-example-backend.vercel.app/callback';
const FLUTTERWAVE_CALLBACK_URL =
  'https://paymentgateway-example-backend.vercel.app/flutterwave-callback';
const INTERSWITCH_REDIRECT_URL =
  'https://paymentgateway-example-backend.vercel.app/payment-response';

function buildConfig(baseUrl: string): PaymentGatewayConfig {
  return {
    // SDK debug logs are written to the developer console (Metro/device logs).
    debug: true,
    processors: [
      {
        id: 'paystack-test',
        type: 'paystack',
        callbackUrl: PAYSTACK_CALLBACK_URL,
      },
      {
        id: 'flutterwave-test',
        type: 'flutterwave',
        callbackUrl: FLUTTERWAVE_CALLBACK_URL,
      },
      {
        id: 'interswitch-sandbox',
        type: 'interswitch',
        callbackUrl: INTERSWITCH_REDIRECT_URL,
        endpoint: INTERSWITCH_ENDPOINT,
        merchantCode: INTERSWITCH_MERCHANT_CODE,
        payItemId: INTERSWITCH_PAY_ITEM_ID,
        payItemName: INTERSWITCH_PAY_ITEM_NAME,
      },
    ],
    initialize: async (request, processor) => {
      if (processor.type !== 'paystack' && processor.type !== 'flutterwave') {
        // Return undefined so the SDK falls back to client-side initialization
        // (Interswitch POST form is built directly in the WebView).
        return undefined;
      }

      const res = await fetch(`${baseUrl}/initialize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request, processor }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Backend error: ${res.status}`);
      }

      const data = await res.json();
      console.log(`${processor.type} initialization response:`, data);
      return { checkoutUrl: data.checkoutUrl };
    },
    verify: async response => {
      if (response.processor === 'paystack') {
        const res = await fetch(`${baseUrl}/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            verified: false,
            message: err.error || `Backend error: ${res.status}`,
          };
        }

        return res.json();
      }

      if (response.processor === 'flutterwave') {
        const res = await fetch(`${baseUrl}/verify-flutterwave`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            verified: false,
            message: err.error || `Backend error: ${res.status}`,
          };
        }

        return res.json();
      }

      if (response.processor === 'interswitch') {
        const res = await fetch(`${baseUrl}/verify-interswitch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(response),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return {
            verified: false,
            message: err.error || `Backend error: ${res.status}`,
          };
        }

        return res.json();
      }

      return { verified: false, message: 'Unsupported processor' };
    },
  };
}

// =============================================================================
// PAYMENT SCREEN
// =============================================================================

function PaymentScreen() {
  const [amount, setAmount] = useState('5000');
  const [email, setEmail] = useState('test@example.com');
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const init = async () => {
      console.log('App mounted');
    };

    init().finally(async () => {
      await BootSplash.hide({ fade: true });
    });
  }, []);

  const request: PaymentRequest = {
    amount: Number(amount) || 0,
    currency: 'NGN',
    reference: `SPF-${Date.now()}`,
    email,
    // Optional metadata forwarded to the processor by your backend
    metadata: {
      orderId: `ORDER-${Date.now()}`,
      app: 'SmartPayFresh',
    },
  };

  const { processors, defaultProcessor } = usePaymentProcessors();
  const {
    pay,
    selectProcessor,
    cancelSelection,
    isProcessing,
    showProcessorSelector,
    response,
    error,
    CheckoutView,
    activeProcessorId,
    failedProcessorIds,
    timedOutProcessorIds,
    reset,
  } = usePayment(request);

  const addLog = (msg: string) => {
    setLogs(prev =>
      [`${new Date().toLocaleTimeString()}: ${msg}`, ...prev].slice(0, 50),
    );
  };

  const handlePay = async () => {
    reset();
    addLog('Starting payment...');
    try {
      const result: PaymentResponse = await pay();
      console.log('Success payment result:', result);
      // Add a concise result to this example app's optional on-screen Event Log.
      addLog(`Result: ${result.status} | Ref: ${result.reference}`);

      Alert.alert(
        'Payment Complete',
        `Status: ${result.status}\nRef: ${result.reference}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`Error: ${message}`);
      Alert.alert('Payment Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payment Gateway SDK Test</Text>
      <Text style={styles.subtitle}>Paystack · Flutterwave · Interswitch</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Amount (kobo)</Text>
        <TextInput
          style={styles.input}
          keyboardType="number-pad"
          value={amount}
          onChangeText={setAmount}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          Default processor:{' '}
          {defaultProcessor?.type ?? 'none (selector will show)'}
        </Text>
        <Text style={styles.infoText}>
          Total processors: {processors.length}
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, isProcessing && styles.buttonDisabled]}
        onPress={handlePay}
        disabled={isProcessing}
      >
        <Text style={styles.buttonText}>
          {isProcessing ? 'Processing...' : 'Pay Now'}
        </Text>
      </TouchableOpacity>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error.message}</Text>
        </View>
      )}

      {response && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>
            {response.status.toUpperCase()} — {response.reference}
          </Text>
        </View>
      )}

      <Text style={styles.logTitle}>Event Log</Text>
      <ScrollView style={styles.logBox}>
        {logs.length === 0 ? (
          <Text style={styles.logEmpty}>No events yet. Tap Pay Now.</Text>
        ) : (
          logs.map((log, i) => (
            <Text key={i} style={styles.logLine}>
              {log}
            </Text>
          ))
        )}
      </ScrollView>

      {/* WebView checkout is rendered here. Note: even if you're using a custom selector, the CheckoutView must be used alongside your custom selector. */}
      {CheckoutView}

      {/*
        SELECTOR BEHAVIOR

        - No processor has `isDefault: true` in this example, so the selector
          opens for the user to choose a processor on every payment.
        - Set `isDefault: true` on one processor to skip the selector when
          `pay()` is called; the default processor will launch directly.
        - After a manual selection, the selector stays open during the brief
          initialization handoff, then closes when the checkout WebView mounts.
        - You can replace PaymentProcessorSelector with your own custom UI.
          Use `usePaymentProcessors()` to get the list and `selectProcessor(id)`
          to trigger the chosen processor. A custom-selector example is included
          at the bottom of this file.
      */}

      <PaymentProcessorSelector
        open={showProcessorSelector}
        processors={processors}
        onSelect={selectProcessor}
        onCancel={cancelSelection}
        isProcessing={isProcessing}
        activeProcessorId={activeProcessorId}
        failedProcessorIds={failedProcessorIds}
        timedOutProcessorIds={timedOutProcessorIds}
        activityIndicatorColor="#007AFF"
        //presentation="fullscreen"   // Uncomment to show the selector as a full-screen modal
        //backgroundColor="blue"      // Uncomment to change the background color of the selector modal
      />

      {/** Example custom selector UI; uncomment this and comment out PaymentProcessorSelector above to try it. */}

      {/* <CustomProcessorSelector
     processors={processors}
     onSelect={selectProcessor}
     onCancel={cancelSelection}
     activeProcessorId={activeProcessorId}
     isProcessing={isProcessing}
     failedProcessorIds={failedProcessorIds}
     visible={showProcessorSelector}
   /> */}
    </View>
  );
}

// =============================================================================
// APP ROOT
// =============================================================================

export default function App() {
  const baseUrl = 'https://paymentgateway-example-backend.vercel.app'; //Demo backend URL. Replace this with your own backend base URL when testing against your server; the SDK itself does not hardcode a backend URL.
  return (
    //setting debug: true in the config enables verbose SDK logs
    <PaymentGatewayProvider config={buildConfig(baseUrl)}>
      <SafeAreaView style={styles.container}>
        <View style={styles.backendInputGroup}>
          <Text style={styles.label}>Backend URL</Text>
          <Text style={styles.input}>{baseUrl}</Text>
        </View>
        <PaymentScreen />
      </SafeAreaView>
    </PaymentGatewayProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  backendInputGroup: {
    marginBottom: 16,
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffecb5',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: '#e9ecef',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#99caff',
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  errorBox: {
    backgroundColor: '#ffebee',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
  },
  successBox: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#2e7d32',
    fontSize: 14,
  },
  logTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  logBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  logEmpty: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  logLine: {
    fontSize: 12,
    color: '#333',
    marginBottom: 6,
    fontFamily: 'monospace',
  },
});

// =============================================================================
// EXAMPLE: Custom processor selector UI
//
// You can build your own selector instead of using PaymentProcessorSelector.
// The SDK exposes everything you need through hooks. Pass `showProcessorSelector`
// for visibility, and use `activeProcessorId`, `isProcessing`, and
// `failedProcessorIds` to replicate the same loading/unavailable/timed-out states as the
// default selector.
//
// function CustomProcessorSelector({
//   processors,
//   onSelect,
//   onCancel,
//   activeProcessorId,
//   isProcessing,
//   failedProcessorIds,
//   timedOutProcessorIds,
//   visible,
// }: {
//   processors: ProcessorConfig[];
//   onSelect: (processorId: string) => void;
//   onCancel: () => void;
//   activeProcessorId?: string;
//   isProcessing: boolean;
//   failedProcessorIds: string[];
//   timedOutProcessorIds: string[];
//   visible: boolean;
// }) {
//   return (
//     <Modal transparent animationType="slide" visible={visible}>
//       <View
//         style={{
//           flex: 1,
//           justifyContent: 'center',
//           backgroundColor: 'rgba(0,0,0,0.5)',
//         }}
//       >
//         <View
//           style={{
//             backgroundColor: '#000',
//             borderRadius: 12,
//             padding: 20,
//             flex: 1,
//           }}
//         >
//           <Text
//             style={{
//               fontSize: 18,
//               fontWeight: 'bold',
//               marginBottom: 16,
//               color: '#fff',
//             }}
//           >
//             Choose payment method
//           </Text>

//           {processors.map(processor => {
//             const isLoading =
//               isProcessing && processor.id === activeProcessorId;
//             const isFailed = failedProcessorIds.includes(processor.id);
//             const isTimedOut = timedOutProcessorIds.includes(processor.id);
//
//             return (
//               <TouchableOpacity
//                 key={processor.id}
//                 style={{
//                   padding: 16,
//                   borderBottomWidth: 1,
//                   borderColor: '#eee',
//                   opacity: isFailed && !isTimedOut ? 0.4 : 1,
//                 }}
//                 onPress={() => onSelect(processor.id)}
//                 disabled={isLoading || (isFailed && !isTimedOut)}
//               >
//                 <Text style={{ fontSize: 16, color: '#fff' }}>
//                   {processor.type.toUpperCase()}
//                   {processor.isDefault ? ' (default)' : ''}
//                 </Text>
//                 {isFailed && !isTimedOut && (
//                   <Text style={{ fontSize: 12, color: '#ff4444' }}>
//                     Unavailable
//                   </Text>
//                 )}
//                 {isTimedOut && (
//                   <Text style={{ fontSize: 12, color: '#ff9800' }}>
//                     Timed out
//                   </Text>
//                 )}
//                 {isLoading && (
//                   <ActivityIndicator
//                     style={{ marginTop: 8 }}
//                     color="#fff"
//                   />
//                 )}
//               </TouchableOpacity>
//             );
//           })}

//           <TouchableOpacity
//             onPress={onCancel}
//             style={{ marginTop: 16, padding: 16 }}
//           >
//             <Text style={{ color: '#ff3b30', textAlign: 'center' }}>
//               Cancel
//             </Text>
//           </TouchableOpacity>
//         </View>
//       </View>
//     </Modal>
//   );
// }
//
// Then in PaymentScreen do:
//
//   <CustomProcessorSelector
//     processors={processors}
//     onSelect={selectProcessor}
//     onCancel={cancelSelection}
//     activeProcessorId={activeProcessorId}
//     isProcessing={isProcessing}
//     failedProcessorIds={failedProcessorIds}
//     timedOutProcessorIds={timedOutProcessorIds}
//     visible={showProcessorSelector}
//   />
// =============================================================================
