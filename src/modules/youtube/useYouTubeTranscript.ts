export interface YTVideoTranscript {
  videoTitle?: string;
  transcript?: string;
  thumbnailUrl?: string;
}

export function useYouTubeTranscript(_videoID: string | null, _onNewTranscript?: (transcript: YTVideoTranscript) => void) {
  return {
    transcript: null,
    loading: false,
    error: null,
  };
}

export async function youTubeGetVideoData(_videoID: string): Promise<YTVideoTranscript | null> {
  return null;
}
