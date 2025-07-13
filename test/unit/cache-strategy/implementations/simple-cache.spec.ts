import { SimpleCache } from '../../../../src/cache-strategy/implementations/simple-cache';

describe('SimpleCache', () => {
	let cache: SimpleCache<number, string>;

	beforeEach(() => {
		cache = new SimpleCache<number, string>();
	});

	describe('constructor', () => {
		it('should create an empty cache', () => {
			const testCache = new SimpleCache<number, string>();
			expect(testCache.get('key1')).toBeUndefined();
		});
	});

	describe('set and get', () => {
		it('should store and retrieve values', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);

			expect(cache.get('key1')).toBe(100);
			expect(cache.get('key2')).toBe(200);
		});

		it('should return undefined for non-existent keys', () => {
			expect(cache.get('nonexistent')).toBeUndefined();
		});

		it('should handle Promise values', async () => {
			const promise = Promise.resolve(300);
			cache.set('key1', promise);

			const result = await cache.get('key1');
			expect(result).toBe(300);
		});

		it('should handle different data types', () => {
			const stringCache = new SimpleCache<string, string>();
			const objectCache = new SimpleCache<object, string>();

			stringCache.set('key1', 'value1');
			objectCache.set('key1', { prop: 'value' });

			expect(stringCache.get('key1')).toBe('value1');
			expect(objectCache.get('key1')).toEqual({ prop: 'value' });
		});
	});

	describe('update behavior', () => {
		it('should update existing values', () => {
			cache.set('key1', 100);
			cache.set('key1', 200);

			expect(cache.get('key1')).toBe(200);
		});

		it('should handle multiple updates', () => {
			cache.set('key1', 100);
			cache.set('key1', 200);
			cache.set('key1', 300);
			cache.set('key1', 400);

			expect(cache.get('key1')).toBe(400);
		});
	});

	describe('delete', () => {
		it('should remove items from cache', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);

			cache.delete('key1');

			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBe(200);
		});

		it('should handle deleting non-existent keys', () => {
			expect(() => cache.delete('nonexistent')).not.toThrow();
		});

		it('should allow re-adding deleted items', () => {
			cache.set('key1', 100);
			cache.delete('key1');
			cache.set('key1', 200);

			expect(cache.get('key1')).toBe(200);
		});

		it('should handle deleting multiple items', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);
			cache.set('key3', 300);

			cache.delete('key1');
			cache.delete('key3');

			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key3')).toBeUndefined();
		});
	});

	describe('edge cases', () => {
		it('should handle null and undefined values', () => {
			cache.set('key1', null as any);
			cache.set('key2', undefined as any);

			expect(cache.get('key1')).toBeNull();
			expect(cache.get('key2')).toBeUndefined();
		});

		it('should handle empty string keys', () => {
			cache.set('', 100);
			expect(cache.get('')).toBe(100);
		});

		it('should handle multiple consecutive gets', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);

			expect(cache.get('key1')).toBe(100);
			expect(cache.get('key1')).toBe(100);
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key1')).toBe(100);
		});

		it('should handle setting same key multiple times', () => {
			cache.set('key1', 100);
			cache.set('key1', 200);
			cache.set('key1', 300);

			expect(cache.get('key1')).toBe(300);
		});
	});

	describe('complex scenarios', () => {
		it('should handle large number of items', () => {
			for (let i = 0; i < 1000; i++) {
				cache.set(`key${i}`, i);
			}

			expect(cache.get('key0')).toBe(0);
			expect(cache.get('key500')).toBe(500);
			expect(cache.get('key999')).toBe(999);
		});

		it('should handle rapid set/get operations', () => {
			for (let i = 0; i < 100; i++) {
				cache.set(`key${i}`, i);
			}

			for (let i = 0; i < 100; i++) {
				expect(cache.get(`key${i}`)).toBe(i);
			}
		});

		it('should handle concurrent operations', () => {
			// Simulate concurrent-like operations
			cache.set('key1', 100);
			cache.set('key2', 200);
			cache.get('key1');
			cache.set('key3', 300);
			cache.delete('key1');
			cache.set('key4', 400);
			cache.get('key2');

			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key3')).toBe(300);
			expect(cache.get('key4')).toBe(400);
		});

		it('should handle mixed data types', () => {
			const mixedCache = new SimpleCache<any, string>();
			mixedCache.set('string', 'hello');
			mixedCache.set('number', 42);
			mixedCache.set('boolean', true);
			mixedCache.set('array', [1, 2, 3]);
			mixedCache.set('object', { a: 1, b: 2 });

			expect(mixedCache.get('string')).toBe('hello');
			expect(mixedCache.get('number')).toBe(42);
			expect(mixedCache.get('boolean')).toBe(true);
			expect(mixedCache.get('array')).toEqual([1, 2, 3]);
			expect(mixedCache.get('object')).toEqual({ a: 1, b: 2 });
		});
	});

	describe('memory behavior', () => {
		it('should not have capacity limits', () => {
			// Simple cache has no capacity limits
			for (let i = 0; i < 1000; i++) {
				cache.set(`key${i}`, i);
			}

			expect(cache.get('key0')).toBe(0);
			expect(cache.get('key500')).toBe(500);
			expect(cache.get('key999')).toBe(999);
		});

		it('should track size correctly without limits', () => {
			// Simple cache doesn't have a size property, but we can test the behavior
			for (let i = 0; i < 100; i++) {
				cache.set(`key${i}`, i);
			}

			// All items should be retrievable
			for (let i = 0; i < 100; i++) {
				expect(cache.get(`key${i}`)).toBe(i);
			}
		});
	});
});
