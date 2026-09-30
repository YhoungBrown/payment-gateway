import { vi } from 'vitest';

vi.mock('react-native', () => ({
  Modal: 'Modal',
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  ScrollView: 'ScrollView',
  StyleSheet: {
    create: (styles: unknown) => styles,
  },
}));

vi.mock('react-native-webview', () => ({
  default: 'WebView',
}));

vi.mock('react-native-inappbrowser-reborn', () => ({
  InAppBrowser: {
    isAvailable: vi.fn(() => Promise.resolve(false)),
    open: vi.fn(() => Promise.resolve({ type: 'cancel' })),
    openAuth: vi.fn(() => Promise.resolve({ type: 'cancel' })),
    close: vi.fn(),
    closeAuth: vi.fn(),
  },
}));


