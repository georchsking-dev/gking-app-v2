export const env: Record<string, string | undefined> = new Proxy(
  {},
  {
    get() {
      return '';
    },
  },
) as any;
