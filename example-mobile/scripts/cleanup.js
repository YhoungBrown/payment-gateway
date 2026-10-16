#!/usr/bin/env node
/* eslint-disable */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const DEMO_FEATURES = ['home', 'user', 'profile', 'settings'];
const FEATURES_DIR = path.join(process.cwd(), 'src', 'features');
const APP_PATH = path.join(process.cwd(), 'App.tsx');
const OLD_IMPORT = "import { HomeScreen } from './src/features/home';";

const ORIGINAL_HOME_SCREEN = `import React from 'react';
import { Text } from 'react-native';
import { Container } from '../../../shared/components/Container';

interface HomeScreenProps {
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
}

export function HomeScreen({ safeAreaInsets }: HomeScreenProps) {
  return (
    <Container>
      <Text style={{ marginTop: safeAreaInsets.top }}>Home Screen</Text>
    </Container>
  );
}`;

function ask(question) {
  return new Promise(resolve => rl.question(question, a => resolve(a.trim())));
}

function featurePath(name) {
  return path.join(FEATURES_DIR, name);
}

function demoFoldersExist() {
  return DEMO_FEATURES.some(f => fs.existsSync(featurePath(f)));
}

function appNeedsReset() {
  if (!fs.existsSync(APP_PATH)) return false;
  return fs.readFileSync(APP_PATH, 'utf8').includes(OLD_IMPORT);
}

function homeScreenIsOriginal() {
  const homeScreenPath = path.join(FEATURES_DIR, 'home', 'screens', 'HomeScreen.tsx');
  if (!fs.existsSync(homeScreenPath)) return false;
  const content = fs.readFileSync(homeScreenPath, 'utf8').replace(/\r\n/g, '\n').trimEnd();
  const expected = ORIGINAL_HOME_SCREEN.replace(/\r\n/g, '\n').trimEnd();
  return content === expected;
}

async function main() {
  const hasDemos = demoFoldersExist();
  const needsReset = appNeedsReset();

  if (!hasDemos && !needsReset) {
    console.log('No demo features to clean up and App.tsx already cleaned. Nothing to do.');
    rl.close();
    return;
  }

  let modified = false;
  if (hasDemos && fs.existsSync(path.join(FEATURES_DIR, 'home', 'screens', 'HomeScreen.tsx'))) {
    modified = !homeScreenIsOriginal();
  }

  console.log('This will:');
  if (hasDemos) {
    console.log('  1. Remove the following demo features:');
    DEMO_FEATURES.forEach(f => {
      const exists = fs.existsSync(featurePath(f));
      console.log(`     - src/features/${f}/ ${exists ? '' : '(not found)'}`);
    });
  }
  if (needsReset) {
    console.log(`  ${hasDemos ? '2.' : '1.'} Reset App.tsx to a minimal placeholder`);
  }

  if (modified) {
    console.log('\n⚠️  src/features/home/ has been modified since creation. Your changes will be lost.');
  }
  console.log('\n⚠️  If you have modified these folders or App.tsx, those changes will be lost.');

  const answer = await ask('\nContinue? (y/n): ');
  if (answer.toLowerCase() !== 'y') {
    console.log('\nAborted. No files were changed.');
    rl.close();
    return;
  }

  // Delete whatever exists
  let deleted = 0;
  let skipped = 0;
  for (const feature of DEMO_FEATURES) {
    const dir = featurePath(feature);
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`  ✅ Removed src/features/${feature}/`);
      deleted++;
    } else {
      skipped++;
    }
  }

  if (deleted === 0 && skipped > 0) {
    console.log('  ⏭️  No demo feature folders found.');
  }

  // Reset App.tsx if needed
  if (needsReset) {
    const stub = `/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import {StatusBar, StyleSheet, useColorScheme, View, Text} from 'react-native';
import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>
        Create features under src/features/ and import them here.{'\\n'}
        Do not write app logic in App.tsx — it is outside the architecture boundaries.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  placeholder: {
    textAlign: 'center',
    padding: 24,
    fontSize: 14,
    color: '#666',
  },
});

export default App;
`;
    fs.writeFileSync(APP_PATH, stub, 'utf8');
    console.log('  ✅ Reset App.tsx to a minimal placeholder');
  }

  console.log('\nCleanup complete.');
  rl.close();
}

main().catch(err => {
  console.error('Unexpected error:', err.message);
  process.exit(1);
});
