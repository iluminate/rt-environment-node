import { MemoryCache } from './cache';
import { RedisCache } from './redis-cache';
import { getEnvironmentValue, closeClient } from './client';

export async function get(
  microserviceId: string,
  configurationKey: string,
  options: { timeout?: number } = {}
): Promise<string> {
  const { timeout = 3000 } = options;
  const cacheKey = `${microserviceId}:${configurationKey}`;

  const memoryCachedValue = MemoryCache.get(cacheKey);
  if (memoryCachedValue) {
    return memoryCachedValue;
  }

  const redisCachedValue = await RedisCache.get(microserviceId, configurationKey);
  if (redisCachedValue) {
    MemoryCache.set(cacheKey, redisCachedValue);
    return redisCachedValue;
  }

  const environmentValue = await getEnvironmentValue(microserviceId, configurationKey, timeout);
  MemoryCache.set(cacheKey, environmentValue);

  RedisCache.set(microserviceId, configurationKey, environmentValue).catch(() => { });

  return environmentValue;
}

export async function close(): Promise<void> {
  await Promise.allSettled([
    RedisCache.close(),
    Promise.resolve(closeClient())
  ]);
}