export const env: Record<string, string | undefined> = new Proxy(
  { ...process.env },
  {
    get(target, prop: string) {
      if (typeof prop === 'string') {
        return process.env[prop] ?? target[prop] ?? '';
      }
      return undefined;
    },
  },
) as any;
