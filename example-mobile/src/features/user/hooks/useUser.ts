import { useState } from 'react';
import { User } from '../types/userTypes';

export function useUser() {
  const [user] = useState<User>({
    id: '1',
    name: 'John Doe',
    email: '[EMAIL_REDACTED]',
  });
  return { user };
}
