import { Remembered } from '../../src/remembered';
import { delay } from '../../src/delay';

describe('Remembered - Readonly and Object.freeze', () => {
	describe('readonly resultType with Object.freeze', () => {
		it('should freeze the result when resultType is readonly', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => ({
				name: 'test',
				value: 42,
			}));

			expect(Object.isFrozen(result)).toBe(true);
			expect(() => {
				(result as any).name = 'modified';
			}).toThrow();
		});

		it('should freeze arrays when resultType is readonly', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => [1, 2, 3]);

			expect(Object.isFrozen(result)).toBe(true);
			expect(() => {
				(result as any)[0] = 999;
			}).toThrow();
		});

		it('should freeze empty objects when resultType is readonly', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => ({}));

			expect(Object.isFrozen(result)).toBe(true);
		});

		it('should not freeze nested objects (shallow freeze only)', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => ({
				name: 'test',
				nested: { value: 42 },
			}));

			expect(Object.isFrozen(result)).toBe(true);
			// Object.freeze only freezes the top level
			expect(Object.isFrozen((result as any).nested)).toBe(false);
		});

		it('should not freeze when resultType is mutable', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'mutable' as const,
			});

			const result = await remembered.get('key1', async () => ({
				name: 'test',
				value: 42,
			}));

			expect(Object.isFrozen(result)).toBe(false);
			(result as any).name = 'modified';
			expect((result as any).name).toBe('modified');
		});

		it('should handle primitive return values with readonly', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => 'string value');

			// Primitives cannot be frozen
			expect(typeof result).toBe('string');
		});
	});

	describe('nonBlocking with readonly result freezing', () => {
		it('should freeze results in nonBlocking mode with readonly', async () => {
			const remembered = new Remembered({
				ttl: 100,
				nonBlocking: true,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => ({
				name: 'test',
				value: 42,
			}));

			expect(Object.isFrozen(result)).toBe(true);
			expect(() => {
				(result as any).name = 'modified';
			}).toThrow();
		});

		it('should return cached result on subsequent calls in nonBlocking', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				nonBlocking: true,
				resultType: 'readonly' as const,
			});

			let callCount = 0;
			const createResult = async () => {
				callCount++;
				return { id: 1, name: 'test' };
			};

			// First call
			const result1 = await remembered.get('key1', createResult);
			expect(callCount).toBe(1);
			expect(Object.isFrozen(result1)).toBe(true);

			// Second call returns cached result immediately
			const result2 = await remembered.get('key1', createResult);
			expect(result2).toBe(result1); // Same reference
		});

		it('should maintain frozen state across multiple accesses in nonBlocking', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				nonBlocking: true,
				resultType: 'readonly' as const,
			});

			const result1 = await remembered.get('key1', async () => ({
				id: 1,
			}));
			const result2 = await remembered.get('key1', async () => ({}));

			expect(Object.isFrozen(result1)).toBe(true);
			expect(Object.isFrozen(result2)).toBe(true);
			expect(result1).toBe(result2); // Same cached reference
		});

		it('should reuse cached reference when object properties are identical', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				nonBlocking: true,
				resultType: 'readonly' as const,
			});

			const firstObject = { id: 1, name: 'test' };
			const secondObject = { id: 1, name: 'test' }; // Different reference, same content

			let callIndex = 0;
			const objects = [firstObject, secondObject];

			const createResult = async () => objects[callIndex++];

			// First call gets firstObject
			const result1 = await remembered.get('key1', createResult);
			expect(Object.isFrozen(result1)).toBe(true);

			// Second call returns cached (still firstObject reference) due to identical properties
			const result2 = await remembered.get('key1', createResult);
			expect(result1).toBe(result2); // Same cached reference
		});

		it('should freeze new object when properties change in nonBlocking', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				nonBlocking: true,
				resultType: 'readonly' as const,
			});

			const objects = [
				{ id: 1, name: 'initial' },
				{ id: 2, name: 'updated' }, // Different properties
			];

			let callIndex = 0;
			const createResult = async () => objects[callIndex++];

			// First call
			const result1 = await remembered.get('key1', createResult);
			expect(result1.id).toBe(1);
			expect(Object.isFrozen(result1)).toBe(true);

			// Manually trigger the comparison logic via blockingGet to simulate background update
			await delay(10); // Small delay
			await remembered.blockingGet('key1', createResult);

			// Background update should have created new frozen object if properties changed
			// Next access should see the new object
			const result3 = await remembered.get('key1', createResult);
			expect(Object.isFrozen(result3)).toBe(true);
		});
	});

	describe('nonBlocking getSync method with readonly', () => {
		it('should return undefined on first call to getSync', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				nonBlocking: true,
				resultType: 'readonly' as const,
			});

			const result = remembered.getSync('key1', async () => ({
				name: 'test',
			}));

			expect(result).toBeUndefined();
		});

		it('should return frozen cached result on subsequent getSync calls', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				nonBlocking: true,
				resultType: 'readonly' as const,
			});

			// Populate cache
			await remembered.get('key1', async () => ({ name: 'test', value: 42 }));

			// getSync now returns cached value
			const result = remembered.getSync('key1', async () => ({
				name: 'different',
			}));

			expect(result).toEqual({ name: 'test', value: 42 });
			expect(Object.isFrozen(result)).toBe(true);
		});
	});

	describe('wrap method with readonly', () => {
		it('should freeze wrapped function results when resultType is readonly', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const getData = async (id: number) => ({
				id,
				name: 'test',
			});

			const wrappedGetData = remembered.wrap(
				getData,
				(id: number) => `key-${id}`,
			);

			const result = await wrappedGetData(1);

			expect(Object.isFrozen(result)).toBe(true);
			expect(() => {
				(result as any).name = 'modified';
			}).toThrow();
		});

		it('should reuse wrapped cached results', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			let callCount = 0;
			const getData = async (id: number) => {
				callCount++;
				return { id, name: 'test' };
			};

			const wrappedGetData = remembered.wrap(
				getData,
				(id: number) => `key-${id}`,
			);

			const result1 = await wrappedGetData(1);
			expect(callCount).toBe(1);

			const result2 = await wrappedGetData(1);
			expect(callCount).toBe(1); // No new call
			expect(result1).toBe(result2); // Same reference
		});

		it('should use different keys for different arguments', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			let callCount = 0;
			const getData = async (id: number) => {
				callCount++;
				return { id, name: 'test' };
			};

			const wrappedGetData = remembered.wrap(
				getData,
				(id: number) => `key-${id}`,
			);

			const result1 = await wrappedGetData(1);
			const result2 = await wrappedGetData(2);
			const result3 = await wrappedGetData(1);

			expect(callCount).toBe(2); // Called for id=1 and id=2 only
			expect(result1.id).toBe(1);
			expect(result2.id).toBe(2);
			expect(result3).toBe(result1); // result3 reuses result1
		});
	});

	describe('readonly with different object types', () => {
		it('should freeze Date objects when resultType is readonly', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => new Date());

			expect(Object.isFrozen(result)).toBe(true);
		});

		it('should freeze Map objects when resultType is readonly', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => new Map());

			expect(Object.isFrozen(result)).toBe(true);
		});

		it('should freeze Set objects when resultType is readonly', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			const result = await remembered.get('key1', async () => new Set());

			expect(Object.isFrozen(result)).toBe(true);
		});
	});

	describe('readonly with TTL expiration', () => {
		it('should freeze re-fetched objects after TTL expires', async () => {
			const remembered = new Remembered({
				ttl: 50,
				resultType: 'readonly' as const,
			});

			let counter = 0;
			const createResult = async () => {
				counter++;
				return { value: counter };
			};

			const result1 = await remembered.get('key1', createResult);
			expect(result1.value).toBe(1);
			expect(Object.isFrozen(result1)).toBe(true);

			// Wait for TTL to expire
			await delay(60);

			const result2 = await remembered.get('key1', createResult);
			expect(result2.value).toBe(2); // New call after TTL
			expect(Object.isFrozen(result2)).toBe(true);
			expect(result1).not.toBe(result2); // Different objects
		});
	});

	describe('error handling with readonly', () => {
		it('should not freeze partial results on error', async () => {
			const remembered = new Remembered({
				ttl: 1000,
				resultType: 'readonly' as const,
			});

			let callCount = 0;
			const faultyCallback = async () => {
				callCount++;
				if (callCount === 1) {
					throw new Error('First call failed');
				}
				return { data: 'success' };
			};

			// First call throws
			await expect(remembered.get('key1', faultyCallback)).rejects.toThrow(
				'First call failed',
			);

			// Second call succeeds and returns frozen result
			const result = await remembered.get('key1', faultyCallback);
			expect(result).toEqual({ data: 'success' });
			expect(Object.isFrozen(result)).toBe(true);
		});
	});
});
