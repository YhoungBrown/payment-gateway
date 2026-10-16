import React from 'react';
import { View, Text } from 'react-native';
import { User } from '../../user';

interface ProfileScreenProps {
  user: User;
}

export function ProfileScreen({ user }: ProfileScreenProps) {
  return (
    <View>
      <Text>Profile: {user.name}</Text>
    </View>
  );
}
