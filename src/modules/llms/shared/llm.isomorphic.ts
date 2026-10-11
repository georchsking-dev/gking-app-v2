export function llmsFixupHost(host: string | undefined, defaultHost: string): string {
  if (!host) return defaultHost;
  let normalized = host.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/+$/, '');
}

export function llmsHostnameMatches(host: string | undefined, ...patterns: string[]): boolean {
  if (!host) return false;
  try {
    const url = new URL(host.startsWith('http') ? host : `https://${host}`);
    return patterns.some((p) => url.hostname.includes(p));
  } catch {
    return false;
  }
}

export function llmsIsNativeOpenAIHost(host: string | undefined): boolean {
  if (!host) return true;
  return llmsHostnameMatches(host, 'api.openai.com');
}
