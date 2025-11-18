import { get } from '../src/index';
import { MemoryCache } from '../src/cache';
import { RedisCache } from '../src/redis-cache';
import { getEnvironmentValue } from '../src/client';

jest.mock('../src/client');
jest.mock('../src/redis-cache');

const mockGetEnvironmentValue = getEnvironmentValue as jest.MockedFunction<typeof getEnvironmentValue>;
const mockRedisCache = RedisCache as jest.Mocked<typeof RedisCache>;

describe('RT Environment Node Library', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (MemoryCache as any).cachedValues?.clear();
    (MemoryCache as any).cacheTimestamps?.clear();
    mockRedisCache.set = jest.fn().mockResolvedValue(undefined);
  });

  describe('Core Functionality', () => {
    it('should return value from HTTP service when no cache exists', async () => {
      const expectedValue = '100';
      mockGetEnvironmentValue.mockResolvedValue(expectedValue);
      mockRedisCache.get.mockResolvedValue(null);

      const result = await get('4', 'test_key');

      expect(result).toBe(expectedValue);
      expect(mockGetEnvironmentValue).toHaveBeenCalledWith('4', 'test_key', 3000);
      expect(mockRedisCache.get).toHaveBeenCalledWith('4', 'test_key');
    });

    it('should return value from Redis cache when available', async () => {
      const expectedValue = '200';
      mockRedisCache.get.mockResolvedValue(expectedValue);

      const result = await get('4', 'test_key');

      expect(result).toBe(expectedValue);
      expect(mockRedisCache.get).toHaveBeenCalledWith('4', 'test_key');
      expect(mockGetEnvironmentValue).not.toHaveBeenCalled();
    });

    it('should return value from memory cache when available', async () => {
      const cacheKey = '4:test_key';
      const expectedValue = '300';
      
      MemoryCache.set(cacheKey, expectedValue);

      const result = await get('4', 'test_key');

      expect(result).toBe(expectedValue);
      expect(mockRedisCache.get).not.toHaveBeenCalled();
      expect(mockGetEnvironmentValue).not.toHaveBeenCalled();
    });
  });

  describe('Cache Strategy', () => {
    it('should populate memory cache from Redis', async () => {
      const redisValue = '400';
      mockRedisCache.get.mockResolvedValue(redisValue);

      const result1 = await get('4', 'populate_test');
      const result2 = await get('4', 'populate_test');

      expect(result1).toBe(redisValue);
      expect(result2).toBe(redisValue);
      expect(mockRedisCache.get).toHaveBeenCalledTimes(1);
    });

    it('should populate memory cache from HTTP service', async () => {
      const httpValue = '500';
      mockRedisCache.get.mockResolvedValue(null);
      mockGetEnvironmentValue.mockResolvedValue(httpValue);

      const result1 = await get('4', 'http_test');
      const result2 = await get('4', 'http_test');

      expect(result1).toBe(httpValue);
      expect(result2).toBe(httpValue);
      expect(mockGetEnvironmentValue).toHaveBeenCalledTimes(1);
    });

    it('should handle cache expiration', async () => {
      const cacheKey = '4:ttl_test';
      const oldValue = '600';
      const newValue = '700';
      
      MemoryCache.set(cacheKey, oldValue);
      const expiredTimestamp = Date.now() - 61000;
      (MemoryCache as any).cacheTimestamps.set(cacheKey, expiredTimestamp);
      
      mockRedisCache.get.mockResolvedValue(null);
      mockGetEnvironmentValue.mockResolvedValue(newValue);

      const result = await get('4', 'ttl_test');

      expect(result).toBe(newValue);
      expect(mockGetEnvironmentValue).toHaveBeenCalledWith('4', 'ttl_test', 3000);
    });
  });

  describe('Error Handling', () => {
    it('should fallback to HTTP when Redis fails', async () => {
      const httpValue = '800';
      mockRedisCache.get.mockResolvedValue(null);
      mockGetEnvironmentValue.mockResolvedValue(httpValue);

      const result = await get('4', 'error_test');

      expect(result).toBe(httpValue);
      expect(mockGetEnvironmentValue).toHaveBeenCalledWith('4', 'error_test', 3000);
    });

    it('should propagate HTTP service errors', async () => {
      const errorMessage = 'HTTP service unavailable';
      mockRedisCache.get.mockResolvedValue(null);
      mockGetEnvironmentValue.mockRejectedValue(new Error(errorMessage));

      await expect(get('4', 'http_error_test')).rejects.toThrow(errorMessage);
    });
  });

  describe('Input Validation', () => {
    it('should handle different microservice IDs and keys', async () => {
      const testCases = [
        { msId: '1', key: 'config_a', value: 'result_1' },
        { msId: '999', key: 'config_b', value: 'result_2' },
        { msId: '4', key: 'long_configuration_key_name', value: 'result_3' }
      ];

      mockRedisCache.get.mockResolvedValue(null);
      
      for (const testCase of testCases) {
        mockGetEnvironmentValue.mockResolvedValue(testCase.value);
        
        const result = await get(testCase.msId, testCase.key);
        
        expect(result).toBe(testCase.value);
        expect(mockGetEnvironmentValue).toHaveBeenCalledWith(testCase.msId, testCase.key, 3000);
      }
    });
  });

  describe('Singleton Behavior', () => {
    it('should maintain singleton cache across multiple imports', () => {
      const cache1 = require('../src/cache').MemoryCache;
      const cache2 = require('../src/cache').MemoryCache;
      
      expect(cache1).toBe(cache2);
    });
  });
});