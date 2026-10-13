export function bareBonesPromptMixer(
  template: string,
  _assistantLlmId?: string | null,
  customVariables?: Record<string, string>,
): string {
  if (!template) return '';
  let result = template;
  if (customVariables) {
    for (const [key, val] of Object.entries(customVariables)) {
      result = result.replaceAll(`{{${key}}}`, val);
    }
  }
  return result;
}
