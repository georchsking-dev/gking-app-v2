export interface NineRouterConfig {
  enabled: boolean;
  type: 'local' | 'tunnel' | 'tailscale' | 'custom';
  endpoint: string;
  apiKey: string;
}

const DEFAULT_CONFIG: NineRouterConfig = {
  enabled: false,
  type: 'local',
  endpoint: 'http://localhost:20128/v1',
  apiKey: '',
};

const STORAGE_KEY = 'gk_9router_config';

export function getNineRouterConfig(): NineRouterConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    // fallback
  }
  return DEFAULT_CONFIG;
}

export function saveNineRouterConfig(config: Partial<NineRouterConfig>): NineRouterConfig {
  const current = getNineRouterConfig();
  const updated = { ...current, ...config };
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  }
  return updated;
}
