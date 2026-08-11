import { sha512 } from 'js-sha512';

export function createSha512Hash(message: string): string {
  return sha512(message);
}
