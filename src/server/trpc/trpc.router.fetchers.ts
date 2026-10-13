export class TRPCFetcherError extends Error {
  httpStatus?: number;
  constructor(message: string, httpStatus?: number) {
    super(message);
    this.name = 'TRPCFetcherError';
    this.httpStatus = httpStatus;
  }
}

export async function fetchResponseOrTRPCThrow(params: {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: any;
  signal?: AbortSignal;
  name?: string;
}): Promise<Response> {
  const { url, method = 'GET', headers, body, signal, name = 'Fetch' } = params;
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
      signal,
    });
  } catch (err: any) {
    if (signal?.aborted) throw err;
    throw new TRPCFetcherError(`${name} network failed: ${err?.message || err}`, 500);
  }
  if (!response.ok) {
    let errorDetail = '';
    try {
      errorDetail = await response.text();
    } catch {
      // ignore
    }
    throw new TRPCFetcherError(`${name} error (${response.status}): ${errorDetail || response.statusText}`, response.status);
  }
  return response;
}

export async function fetchJsonOrTRPCThrow<T = any, TBody = any>(params: {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: TBody;
  signal?: AbortSignal;
  name?: string;
}): Promise<T> {
  const response = await fetchResponseOrTRPCThrow(params);
  return (await response.json()) as T;
}

export async function fetchTextOrTRPCThrow(params: {
  url: string;
  method?: string;
  headers?: HeadersInit;
  body?: any;
  signal?: AbortSignal;
  name?: string;
}): Promise<string> {
  const response = await fetchResponseOrTRPCThrow(params);
  return await response.text();
}
