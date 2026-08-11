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
