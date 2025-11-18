import { CONFIG } from './constants';

class MemoryCacheSingleton {
  private static instance: MemoryCacheSingleton;
  private cachedValues = new Map<string, string>();
  private cacheTimestamps = new Map<string, number>();
  private readonly timeToLive = CONFIG.CACHE_TTL_MILLISECONDS;

  private constructor() { }

  static getInstance(): MemoryCacheSingleton {
    if (!MemoryCacheSingleton.instance) {
      MemoryCacheSingleton.instance = new MemoryCacheSingleton();
    }
    return MemoryCacheSingleton.instance;
  }

  get(cacheKey: string): string | null {
    const cachedTimestamp = this.cacheTimestamps.get(cacheKey);
    if (!cachedTimestamp) return null;

    if (Date.now() - cachedTimestamp > this.timeToLive) {
      this.cachedValues.delete(cacheKey);
      this.cacheTimestamps.delete(cacheKey);
      return null;
    }

    return this.cachedValues.get(cacheKey) || null;
  }

  set(cacheKey: string, value: string): void {
    this.cachedValues.set(cacheKey, value);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }
}

export const MemoryCache = MemoryCacheSingleton.getInstance();