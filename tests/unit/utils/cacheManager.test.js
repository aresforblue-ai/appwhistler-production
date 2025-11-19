// tests/unit/utils/cacheManager.test.js
// Cache manager unit tests

const cacheManager = require('../../../src/backend/utils/cacheManager');

describe('CacheManager', () => {
  beforeEach(async () => {
    // Clear cache before each test
    await cacheManager.clear();
  });

  describe('get/set operations', () => {
    test('should set and get a value from cache', async () => {
      const key = 'test:key';
      const value = { id: 1, name: 'Test' };

      await cacheManager.set(key, value);
      const cached = await cacheManager.get(key);

      expect(cached).toEqual(value);
    });

    test('should return null for missing keys', async () => {
      const result = await cacheManager.get('nonexistent:key');
      expect(result).toBeNull();
    });

    test('should respect TTL for in-memory cache', async () => {
      const key = 'ttl:test';
      const value = { test: true };

      // Set with 1 second TTL
      await cacheManager.set(key, value, 1);

      // Should exist immediately
      let cached = await cacheManager.get(key);
      expect(cached).toEqual(value);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired now
      cached = await cacheManager.get(key);
      expect(cached).toBeNull();
    });

    test('should handle deletion', async () => {
      const key = 'delete:test';
      const value = { data: 'deleteme' };

      await cacheManager.set(key, value);
      expect(await cacheManager.get(key)).toEqual(value);

      await cacheManager.delete(key);
      expect(await cacheManager.get(key)).toBeNull();
    });

    test('should handle null/undefined values gracefully', async () => {
      await cacheManager.set('null:key', null);
      await cacheManager.set('undefined:key', undefined);
      
      // Should not cache null/undefined
      expect(await cacheManager.get('null:key')).toBeNull();
      expect(await cacheManager.get('undefined:key')).toBeNull();
    });
  });

  describe('getOrSet wrapper', () => {
    test('should fetch and cache data on first call', async () => {
      const key = 'fetch:test';
      let fetchCount = 0;

      const fetchFn = async () => {
        fetchCount++;
        return { data: 'fetched' };
      };

      const result1 = await cacheManager.getOrSet(key, fetchFn);
      expect(result1).toEqual({ data: 'fetched' });
      expect(fetchCount).toBe(1);

      // Second call should use cache
      const result2 = await cacheManager.getOrSet(key, fetchFn);
      expect(result2).toEqual({ data: 'fetched' });
      expect(fetchCount).toBe(1); // Not called again
    });

    test('should handle async fetch errors', async () => {
      const key = 'error:test';
      
      const fetchFn = async () => {
        throw new Error('Fetch failed');
      };

      await expect(cacheManager.getOrSet(key, fetchFn))
        .rejects
        .toThrow('Fetch failed');
    });

    test('should not cache null values from fetch', async () => {
      const key = 'null:fetch';
      let callCount = 0;

      const fetchFn = async () => {
        callCount++;
        return null;
      };

      await cacheManager.getOrSet(key, fetchFn);
      expect(callCount).toBe(1);

      // Second call should fetch again since null wasn't cached
      await cacheManager.getOrSet(key, fetchFn);
      expect(callCount).toBe(2);
    });
  });

  describe('key generation', () => {
    test('should generate consistent cache keys', () => {
      const params = { limit: 10, offset: 0 };
      
      const key1 = cacheManager.constructor.generateKey('test', params);
      const key2 = cacheManager.constructor.generateKey('test', params);

      expect(key1).toBe(key2);
    });

    test('should generate different keys for different params', () => {
      const key1 = cacheManager.constructor.generateKey('test', { limit: 10 });
      const key2 = cacheManager.constructor.generateKey('test', { limit: 20 });

      expect(key1).not.toBe(key2);
    });

    test('should handle complex objects in params', () => {
      const params = {
        filters: { category: 'app', platform: 'ios' },
        pagination: { limit: 10, offset: 0 }
      };

      const key = cacheManager.constructor.generateKey('complex', params);
      expect(key).toBeTruthy();
      expect(key).toContain('complex:');
    });
  });

  describe('clear operation', () => {
    test('should clear all cache entries', async () => {
      const key1 = 'clear:test1';
      const key2 = 'clear:test2';

      await cacheManager.set(key1, { id: 1 });
      await cacheManager.set(key2, { id: 2 });

      expect(await cacheManager.get(key1)).toBeTruthy();
      expect(await cacheManager.get(key2)).toBeTruthy();

      await cacheManager.clear();

      expect(await cacheManager.get(key1)).toBeNull();
      expect(await cacheManager.get(key2)).toBeNull();
    });
  });

  describe('concurrent operations', () => {
    test('should handle concurrent reads and writes', async () => {
      const promises = [];

      for (let i = 0; i < 10; i++) {
        promises.push(
          cacheManager.set(`concurrent:${i}`, { value: i })
        );
      }

      await Promise.all(promises);

      const reads = [];
      for (let i = 0; i < 10; i++) {
        reads.push(cacheManager.get(`concurrent:${i}`));
      }

      const results = await Promise.all(reads);
      results.forEach((result, idx) => {
        expect(result?.value).toBe(idx);
      });
    });
  });

  describe('error handling', () => {
    test('should handle errors gracefully', async () => {
      // Try to get/set invalid keys
      await cacheManager.set('', 'value'); // Empty key
      await cacheManager.set(null, 'value'); // Null key
      
      const result1 = await cacheManager.get('');
      const result2 = await cacheManager.get(null);

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });
});
