import { nanoid } from 'nanoid';

export function serverSideId(prefix?: string): string {
  return prefix ? `${prefix}-${nanoid()}` : nanoid();
}
