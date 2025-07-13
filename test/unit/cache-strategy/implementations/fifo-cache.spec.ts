import { FifoCache } from '../../../../src/cache-strategy/implementations/fifo-cache';

describe('FifoCache', () => {
	let cache: FifoCache<number, string>;

	beforeEach(() => {
		cache = new FifoCache<number, string>(3);
	});

	describe('constructor', () => {
		it('should create an empty cache with specified capacity', () => {
			const testCache = new FifoCache<number, string>(5);
			expect(testCache.get('key1')).toBeUndefined();
		});

		it('should throw error for negative capacity', () => {
			expect(() => new FifoCache<number, string>(-1)).toThrow(
				'Capacity must be greater than or equal to 0',
			);
		});

		it('should accept capacity of 0', () => {
			expect(() => new FifoCache<number, string>(0)).not.toThrow();
		});

		it('should not store items when capacity is 0', () => {
			const zeroCache = new FifoCache<number, string>(0);
			zeroCache.set('key1', 100);
			zeroCache.set('key2', 200);

			expect(zeroCache.get('key1')).toBeUndefined();
			expect(zeroCache.get('key2')).toBeUndefined();
			expect(zeroCache['size']).toBe(0);
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
	});

	describe('FIFO behavior', () => {
		it('should evict first in item when capacity is exceeded', () => {
			cache.set('key1', 100);
			expect(cache['size']).toBe(1);

			cache.set('key2', 200);
			expect(cache['size']).toBe(2);

			cache.set('key3', 300);
			expect(cache['size']).toBe(3);

			cache.set('key4', 400); // This should evict key1 (first in)
			expect(cache['size']).toBe(3); // Size should remain at capacity

			expect(cache.get('key1')).toBeUndefined(); // Should be evicted
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key3')).toBe(300);
			expect(cache.get('key4')).toBe(400);
		});

		it('should not move accessed items to front', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);
			cache.set('key3', 300);

			// Access key1, but it should not move to front
			cache.get('key1');

			// Add new item, should evict key1 (first in, regardless of access)
			cache.set('key4', 400);

			expect(cache.get('key1')).toBeUndefined(); // Should be evicted
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key3')).toBe(300);
			expect(cache.get('key4')).toBe(400);
		});

		it('should update existing items without changing position', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);
			cache.set('key3', 300);

			// Update key1, should not change its position
			cache.set('key1', 150);

			// Add new item, should evict key1 (first in)
			cache.set('key4', 400);

			expect(cache.get('key1')).toBeUndefined(); // Should be evicted
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key3')).toBe(300);
			expect(cache.get('key4')).toBe(400);
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
	});

	describe('edge cases', () => {
		it('should handle cache with capacity 1', () => {
			const singleCache = new FifoCache<number, string>(1);
			singleCache.set('key1', 100);
			expect(singleCache['size']).toBe(1);

			singleCache.set('key2', 200);
			expect(singleCache['size']).toBe(1); // Size should remain at capacity

			expect(singleCache.get('key1')).toBeUndefined();
			expect(singleCache.get('key2')).toBe(200);
		});

		it('should handle cache with capacity 0', () => {
			const zeroCache = new FifoCache<number, string>(0);
			zeroCache.set('key1', 100);
			expect(zeroCache['size']).toBe(0); // Size should remain 0

			expect(zeroCache.get('key1')).toBeUndefined();
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
		it('should maintain FIFO order after complex operations', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);
			cache.set('key3', 300);

			// Access key2 and key1, but they should not move
			cache.get('key2');
			cache.get('key1');

			// Add new item, should evict key1 (first in)
			cache.set('key4', 400);

			expect(cache.get('key1')).toBeUndefined(); // Should be evicted
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key3')).toBe(300);
			expect(cache.get('key4')).toBe(400);
		});

		it('should handle rapid set/get operations', () => {
			for (let i = 0; i < 10; i++) {
				cache.set(`key${i}`, i);
				expect(cache['size']).toBeLessThanOrEqual(3); // Size should never exceed capacity
			}

			expect(cache['size']).toBe(3); // Final size should be at capacity

			// In FIFO, the first items are evicted first
			// So the last 3 items (key7, key8, key9) should remain
			expect(cache.get('key7')).toBe(7);
			expect(cache.get('key8')).toBe(8);
			expect(cache.get('key9')).toBe(9);
			expect(cache.get('key0')).toBeUndefined();
		});

		it('should maintain strict FIFO order', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);
			cache.set('key3', 300);

			// Access all items multiple times
			cache.get('key3');
			cache.get('key2');
			cache.get('key1');
			cache.get('key3');
			cache.get('key2');

			// Add new item, should evict key1 (first in, regardless of access)
			cache.set('key4', 400);

			expect(cache.get('key1')).toBeUndefined(); // Should be evicted
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key3')).toBe(300);
			expect(cache.get('key4')).toBe(400);
		});
	});
});
