export interface SharedChatLinkItem {
  id: string;
  objectId?: string;
  title?: string;
  createdAt?: string;
  expiresAt?: string;
  deletionKey?: string;
}

export function hasNoChatLinkItems(): boolean {
  return true;
}

export function useSharedChatLinkItems(): SharedChatLinkItem[] {
  return [];
}

export function forgetChatLinkItem(_objectId: string): void {
  // no-op stub
}
