import { BaseCache } from '../../../../src/cache-strategy/core/base-cache';
import { Node } from '../../../../src/cache-strategy/utils/linked-list';

// Create a concrete implementation for testing
class TestCache<TResponse = unknown, TKey = string> extends BaseCache<
	TResponse,
	TKey
> {
	get(key: TKey): TResponse | Promise<TResponse> | undefined {
		const item = this.map.get(key);
		return item ? item.value : undefined;
	}

	protected handleExistingItemAccess(
		item: Node<TResponse, TKey>,
		value: TResponse | Promise<TResponse>,
	): void {
		// Test implementation: just update the value
		item.value = value;
	}

	protected evictItem(): void {
		// Test implementation: remove the last item
		const nodeToRemove = this.getTail().prev;
		if (nodeToRemove && nodeToRemove.key) {
			this.linkedList.removeNode(nodeToRemove);
			this.map.delete(nodeToRemove.key);
			this.size--;
		}
	}
}

describe('BaseCache', () => {
	let cache: TestCache<number, string>;

	beforeEach(() => {
		cache = new TestCache<number, string>(3);
	});

	describe('constructor', () => {
		it('should create an empty cache with specified capacity', () => {
			const testCache = new TestCache<number, string>(5);
			expect(testCache.get('key1')).toBeUndefined();
		});

		it('should initialize with correct capacity', () => {
			const testCache = new TestCache<number, string>(10);
			// Access protected property through reflection or test methods
			expect(testCache['capacity']).toBe(10);
		});

		it('should throw error for negative capacity', () => {
			expect(() => new TestCache<number, string>(-1)).toThrow(
				'Capacity must be greater than or equal to 0',
			);
		});

		it('should accept capacity of 0', () => {
			expect(() => new TestCache<number, string>(0)).not.toThrow();
		});

		it('should not store items when capacity is 0', () => {
			const zeroCache = new TestCache<number, string>(0);
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

	describe('capacity management', () => {
		it('should evict items when capacity is exceeded', () => {
			cache.set('key1', 100);
			expect(cache['size']).toBe(1);

			cache.set('key2', 200);
			expect(cache['size']).toBe(2);

			cache.set('key3', 300);
			expect(cache['size']).toBe(3);

			cache.set('key4', 400); // Should evict key1
			expect(cache['size']).toBe(3); // Size should remain at capacity

			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBe(200);
			expect(cache.get('key3')).toBe(300);
			expect(cache.get('key4')).toBe(400);
		});

		it('should handle cache with capacity 1', () => {
			const singleCache = new TestCache<number, string>(1);
			singleCache.set('key1', 100);
			expect(singleCache['size']).toBe(1);

			singleCache.set('key2', 200);
			expect(singleCache['size']).toBe(1); // Size should remain at capacity

			expect(singleCache.get('key1')).toBeUndefined();
			expect(singleCache.get('key2')).toBe(200);
		});

		it('should handle cache with capacity 0', () => {
			const zeroCache = new TestCache<number, string>(0);
			zeroCache.set('key1', 100);
			expect(zeroCache['size']).toBe(0); // Size should remain 0

			expect(zeroCache.get('key1')).toBeUndefined();
		});
	});

	describe('update behavior', () => {
		it('should update existing items', () => {
			cache.set('key1', 100);
			cache.set('key1', 200);

			expect(cache.get('key1')).toBe(200);
		});

		it('should handle multiple updates', () => {
			cache.set('key1', 100);
			cache.set('key1', 200);
			cache.set('key1', 300);

			expect(cache.get('key1')).toBe(300);
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

	describe('size management', () => {
		it('should track size correctly', () => {
			expect(cache['size']).toBe(0);

			cache.set('key1', 100);
			expect(cache['size']).toBe(1);

			cache.set('key2', 200);
			expect(cache['size']).toBe(2);

			cache.delete('key1');
			expect(cache['size']).toBe(1);
		});

		it('should not increase size when updating existing items', () => {
			cache.set('key1', 100);
			expect(cache['size']).toBe(1);

			cache.set('key1', 200);
			expect(cache['size']).toBe(1);
		});
	});

	describe('edge cases', () => {
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

		it('should handle rapid set/get operations', () => {
			for (let i = 0; i < 10; i++) {
				cache.set(`key${i}`, i);
				expect(cache['size']).toBeLessThanOrEqual(3); // Size should never exceed capacity
			}

			expect(cache['size']).toBe(3); // Final size should be at capacity

			// Should only have the last 3 items
			expect(cache.get('key7')).toBe(7);
			expect(cache.get('key8')).toBe(8);
			expect(cache.get('key9')).toBe(9);
			expect(cache.get('key0')).toBeUndefined();
		});
	});

	describe('abstract methods', () => {
		it('should call handleExistingItemAccess when updating existing items', () => {
			cache.set('key1', 100);

			// Spy on the method to verify it's called
			const spy = jest.spyOn(cache as any, 'handleExistingItemAccess');

			cache.set('key1', 200);

			expect(spy).toHaveBeenCalledWith(expect.any(Node), 200);
		});

		it('should call evictItem when capacity is exceeded', () => {
			cache.set('key1', 100);
			cache.set('key2', 200);
			cache.set('key3', 300);

			// Spy on the method to verify it's called
			const spy = jest.spyOn(cache as any, 'evictItem');

			cache.set('key4', 400);

			expect(spy).toHaveBeenCalled();
		});
	});
});
