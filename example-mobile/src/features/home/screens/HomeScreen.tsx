import React from 'react';
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
}
