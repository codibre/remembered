import { createCache } from '../../../../src/cache-strategy/cache-factory';
import { LruCache } from '../../../../src/cache-strategy/implementations/lru-cache';
import { MruCache } from '../../../../src/cache-strategy/implementations/mru-cache';
import { FifoCache } from '../../../../src/cache-strategy/implementations/fifo-cache';
import { SimpleCache } from '../../../../src/cache-strategy/implementations/simple-cache';
import { RememberedConfig } from '../../../../src/remembered-config';

describe('createCache', () => {
	describe('LRU policy', () => {
		it('should create LRU cache with specified capacity', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'LRU',
				capacity: 5,
			};

			const cache = createCache(config) as LruCache<number, string>;

			expect(cache).toBeInstanceOf(LruCache);
			expect(cache['capacity']).toBe(5);
		});

		it('should create LRU cache with capacity 0', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'LRU',
				capacity: 0,
			};

			const cache = createCache(config) as LruCache<number, string>;

			expect(cache).toBeInstanceOf(LruCache);
			expect(cache['capacity']).toBe(0);
		});
	});

	describe('MRU policy', () => {
		it('should create MRU cache with specified capacity', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'MRU',
				capacity: 3,
			};

			const cache = createCache(config) as MruCache<number, string>;

			expect(cache).toBeInstanceOf(MruCache);
			expect(cache['capacity']).toBe(3);
		});

		it('should create MRU cache with capacity 0', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'MRU',
				capacity: 0,
			};

			const cache = createCache(config) as MruCache<number, string>;

			expect(cache).toBeInstanceOf(MruCache);
			expect(cache['capacity']).toBe(0);
		});
	});

	describe('FIFO policy', () => {
		it('should create FIFO cache with specified capacity', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'FIFO',
				capacity: 4,
			};

			const cache = createCache(config) as FifoCache<number, string>;

			expect(cache).toBeInstanceOf(FifoCache);
			expect(cache['capacity']).toBe(4);
		});

		it('should create FIFO cache with capacity 0', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'FIFO',
				capacity: 0,
			};

			const cache = createCache(config) as FifoCache<number, string>;

			expect(cache).toBeInstanceOf(FifoCache);
			expect(cache['capacity']).toBe(0);
		});
	});

	describe('default policy (Simple)', () => {
		it('should create Simple cache when no eviction policy is specified', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
			};

			const cache = createCache(config);

			expect(cache).toBeInstanceOf(SimpleCache);
		});

		it('should create Simple cache when eviction policy is undefined', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: undefined,
			};

			const cache = createCache(config);

			expect(cache).toBeInstanceOf(SimpleCache);
		});

		it('should create Simple cache when eviction policy is null', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: null as any,
			};

			const cache = createCache(config);

			expect(cache).toBeInstanceOf(SimpleCache);
		});

		it('should create Simple cache when eviction policy is empty string', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: '' as any,
			};

			const cache = createCache(config);

			expect(cache).toBeInstanceOf(SimpleCache);
		});

		it('should create Simple cache when eviction policy is invalid', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'INVALID' as any,
			};

			const cache = createCache(config);

			expect(cache).toBeInstanceOf(SimpleCache);
		});
	});
	describe('edge cases', () => {
		it('should handle negative capacity gracefully', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'LRU',
				capacity: -1,
			};

			// This should throw an error due to capacity validation in BaseCache
			expect(() => createCache(config)).toThrow(
				'Capacity must be greater than or equal to 0',
			);
		});

		it('should handle very large capacity', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 1000,
				evictionPolicy: 'LRU',
				capacity: Number.MAX_SAFE_INTEGER,
			};

			const cache = createCache(config) as LruCache<number, string>;

			expect(cache).toBeInstanceOf(LruCache);
			expect(cache['capacity']).toBe(Number.MAX_SAFE_INTEGER);
		});

		it('should handle zero TTL', () => {
			const config: RememberedConfig<number, string> = {
				ttl: 0,
				evictionPolicy: 'LRU',
				capacity: 5,
			};

			const cache = createCache(config) as MruCache<number, string>;

			expect(cache).toBeInstanceOf(LruCache);
			expect(cache['capacity']).toBe(5);
		});

		it('should handle function TTL', () => {
			const ttlFunction = (key: string, response?: number) =>
				response ? response * 2 : 100;
			const config: RememberedConfig<number, string> = {
				ttl: ttlFunction,
				evictionPolicy: 'MRU',
				capacity: 3,
			};

			const cache = createCache(config) as MruCache<number, string>;

			expect(cache).toBeInstanceOf(MruCache);
			expect(cache['capacity']).toBe(3);
		});
	});
});
