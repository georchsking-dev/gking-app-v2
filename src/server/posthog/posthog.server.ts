export async function posthogServerSendException(
  error: unknown,
  distinctId?: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  // Safe no-op on server side in AI Studio
}
