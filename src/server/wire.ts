export const SERVER_DEBUG_WIRE = false;

export function safeErrorString(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function escapeXml(unsafe: string): string {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function createEmptyReadableStream(): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.close();
    },
  });
}

export function abortableDelay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      return reject(signal.reason ?? new Error('Aborted'));
    }
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error('Aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export interface DebugWireLogger {
  logRequest: (method: string, url: string, headers?: any, body?: any) => void;
  logResponse: (response: any) => void;
}

export function createDebugWireLogger(prefix: string): DebugWireLogger | null {
  if (process.env.NODE_ENV !== 'development' && !process.env.DEBUG_WIRE) {
    return null;
  }
  return {
    logRequest: (method, url, headers, body) => {
      // debug log
    },
    logResponse: (response) => {
      // debug log
    },
  };
}

export function serverCapitalizeFirstLetter(str: string): string {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
}
