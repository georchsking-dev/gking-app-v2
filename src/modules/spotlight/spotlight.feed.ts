export interface SpotlightFeedAnnouncement {
  id: string;
  title: string;
  date: string;
  content: string;
}

export interface SpotlightFeedChangelogGroup {
  version: string;
  date: string;
  items: string[];
}

export type SpotlightFeedTier = 'all' | 'free' | 'pro';

export function useSpotlightFeedAnnouncements() {
  return {
    announcements: [] as SpotlightFeedAnnouncement[],
    loading: false,
  };
}

export function useSpotlightFeedChangelog() {
  return {
    groups: [] as SpotlightFeedChangelogGroup[],
    loading: false,
  };
}
