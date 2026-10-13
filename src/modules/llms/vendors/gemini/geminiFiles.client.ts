export async function geminiFileDelete(_access: any, _fileId: string): Promise<void> {
  // stub
}

export async function geminiFileDownloadBlob(_access: any, _fileId: string): Promise<Blob> {
  throw new Error('Not implemented');
}

export function geminiFileErrorIsGone(_error: any): boolean {
  return false;
}

export async function geminiFileGetMetadata(_access: any, _fileId: string): Promise<any> {
  return null;
}
