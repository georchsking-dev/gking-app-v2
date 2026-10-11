import { abortableDelay } from '../wire';

export interface RetryAttempt {
  attempt: number;
  maxAttempts: number;
}

export async function fetchWithAbortableConnectionRetry<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  abortSignal: AbortSignal,
  onRetryAttempt?: (info: RetryAttempt) => void,
  maxAttempts = 3,
  retryDelayMs = 500,
): Promise<T> {
  let attempt = 1;
  while (true) {
    try {
      return await operation(abortSignal);
    } catch (err: any) {
      if (abortSignal.aborted || attempt >= maxAttempts) {
        throw err;
      }
      onRetryAttempt?.({ attempt: attempt + 1, maxAttempts });
      await abortableDelay(retryDelayMs * attempt, abortSignal);
      attempt++;
    }
  }
}
