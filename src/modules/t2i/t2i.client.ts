export function useCapabilityTextToImage() {
  return {
    mayWork: false,
    mayEdit: false,
    isConfigured: false,
  };
}

export function getActiveTextToImageProviderOrThrow(): any {
  throw new Error('Text to image is not configured');
}

export async function t2iGenerateImageContentFragments(..._args: any[]): Promise<any[]> {
  throw new Error('Text to image is not configured');
}
