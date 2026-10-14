import Redis from 'ioredis';
import { Mutex } from 'redis-semaphore';
import { promisify } from 'util';
import { v4 } from 'uuid';
import { EMPTY, RememberedRedis } from '../../src';
import { AlternativePersistence } from '../../src/remembered-redis-config';
import { gzipValueSerializer } from '../../src/gzip-value-serializer';

const delay = promisify(setTimeout);

async function* generate<T>(items: T[]): AsyncGenerator<T> {
	for (const item of items) {
		yield item;
	}
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
	const result: T[] = [];
	for await (const item of iterable) {
		result.push(item);
	}
	return result;
}

async function* slowGenerate<T>(items: T[], ms: number) {
	for (const item of items) {
		await delay(ms);
		yield item;
	}
}

async function eventually(
	check: () => Promise<boolean>,
	timeoutMs = 3000,
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		if (await check()) {
			return;
		}
		if (Date.now() > deadline) {
			throw new Error('condition not met in time');
		}
		await delay(25);
	}
}

/**
 * End-to-end functional validation of everything the library does, against a
 * real Redis (the CI service): the classic remember surface (get, wrap,
 * runAndCache, getFromCache, updateCache, clearCache, semaphores,
 * alternative persistence) and the SWR streamed cache, including its core
 * memory guarantee.
 */
describe('e2e: functional', () => {
	let redis: Redis;
	let target: RememberedRedis;
	let key: string;

	const redisKey = (k: string) => `REMEMBERED:${k}`;
	const newTarget = (
		config: Partial<ConstructorParameters<typeof RememberedRedis>[0]> = {},
		client: Redis = redis,
	) =>
		new RememberedRedis(
			{
				ttl: 1000,
				redisTtl: 100000,
				redisPrefix: 'REMEMBERED',
				...config,
			},
			client,
		);

	beforeAll(() => {
		redis = new Redis();
	});

	afterAll(async () => {
		await redis.quit();
	});

	beforeEach(() => {
		key = v4();
		target = newTarget();
	});

	afterEach(async () => {
		await redis.flushdb();
	});

	describe('classic remember surface', () => {
		it('should run the callback once, cache it in redis with prefix and ttl, and reuse it', async () => {
			const callback = jest.fn(async () => ({ hello: 'world', n: 42 }));

			const first = await target.get(key, callback);
			expect(first).toEqual({ hello: 'world', n: 42 });
			expect(callback).toHaveBeenCalledTimes(1);

			// cached in redis (async save), prefixed, with a ttl
			await eventually(async () => (await redis.exists(redisKey(key))) === 1);
			expect(await redis.ttl(redisKey(key))).toBeGreaterThan(0);

			// reuse: from this instance...
			const second = await target.get(key, callback);
			expect(second).toEqual(first);
			expect(callback).toHaveBeenCalledTimes(1);

			// ...and from a fresh instance (redis-backed sharing, no memory maps)
			const fresh = newTarget();
			const third = await fresh.get(key, callback);
			expect(third).toEqual(first);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should compress values by default and keep them plain when noCompress', async () => {
			await newTarget().get(key, async () => ({ data: 'x'.repeat(500) }));
			await eventually(async () => (await redis.exists(redisKey(key))) === 1);
			const raw = (await redis.getBuffer(redisKey(key))) as Buffer;
			// gzip magic number
			expect(raw[0]).toBe(0x1f);
			expect(raw[1]).toBe(0x8b);

			const plainKey = v4();
			await newTarget({ noCompress: true }).get(plainKey, async () => ({
				data: 'plain',
			}));
			await eventually(
				async () => (await redis.exists(redisKey(plainKey))) === 1,
			);
			const plain = await redis.get(redisKey(plainKey));
			expect(plain).toContain('"data":"plain"');
		});

		it('should not cache when noCacheIf rejects the result or the result is undefined', async () => {
			const callback = jest.fn(async () => 'skip-me');
			await target.get(key, callback, (r) => r === 'skip-me');
			expect(await redis.exists(redisKey(key))).toBe(0);
			await target.get(key, callback, (r) => r === 'skip-me');
			expect(callback).toHaveBeenCalledTimes(2);

			const undefKey = v4();
			const undef = jest.fn(async () => undefined);
			await target.get(undefKey, undef);
			expect(await redis.exists(redisKey(undefKey))).toBe(0);
		});

		it('should refetch after the ttl expires', async () => {
			const callback = jest.fn(async () => v4());
			const shortLived = newTarget({ ttl: 300, redisTtl: 1 });

			const first = await shortLived.get(key, callback);
			const second = await shortLived.get(key, callback);
			expect(second).toBe(first);

			await delay(1300);
			const third = await shortLived.get(key, callback);
			expect(third).not.toBe(first);
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should forget the redis copy on clearCache, refetching for new instances', async () => {
			await target.get(key, async () => 'cached');
			await eventually(async () => (await redis.exists(redisKey(key))) === 1);

			await target.clearCache(key);
			expect(await redis.exists(redisKey(key))).toBe(0);

			// pre-existing contract: the calling instance keeps the in-memory
			// memo until its ttl purges it; a new instance sees the clear
			const callback = jest.fn(async () => 'refetched');
			expect(await newTarget().get(key, callback)).toBe('refetched');
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should updateCache directly and serve it without running the callback', async () => {
			await target.updateCache(key, { seeded: true });
			const callback = jest.fn(async () => 'never');
			expect(await target.get(key, callback)).toEqual({ seeded: true });
			expect(callback).not.toHaveBeenCalled();
		});

		it('should return EMPTY from getFromCache on misses and the value on hits', async () => {
			expect(await target.getFromCache(v4())).toBe(EMPTY);
			await target.updateCache(key, 'a-value');
			expect(await target.getFromCache(key)).toBe('a-value');
		});

		it('should memoize through wrap, sharing through redis', async () => {
			const callback = jest.fn(async (id: number) => ({
				id,
				when: Date.now(),
			}));
			const wrapped = target.wrap(callback, (id: number) => `wrap:${id}`);

			const first = await wrapped(1);
			expect(await wrapped(1)).toBe(first);
			const secondInstance = newTarget();
			const wrappedElsewhere = secondInstance.wrap(
				callback,
				(id: number) => `wrap:${id}`,
			);
			expect(await wrappedElsewhere(1)).toEqual(first);
			expect(callback).toHaveBeenCalledTimes(1);

			await wrapped(2);
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should throw getSync only outside nonBlocking mode', () => {
			expect(() => target.getSync(key, async () => 1)).toThrow(
				'getSync is only available for nonBlocking instances',
			);
		});

		it('should run and cache via runAndCache, honoring noCacheIf', async () => {
			const result = await target.runAndCache(key, async () => 'stored');
			expect(result).toBe('stored');
			expect(await target.getFromCache(key)).toBe('stored');

			await target.runAndCache(
				`${key}-nc`,
				async () => 'not-stored',
				(r) => r === 'not-stored',
			);
			expect(await target.getFromCache(`${key}-nc`)).toBe(EMPTY);
		});

		it('should wait for a foreign holder of the key mutex, then serve the redis value', async () => {
			// another process holds the remembering mutex for this key and,
			// while holding it, populates the cache. The library names the
			// mutex key with the redis prefix
			const mutex = new Mutex(redis, `REMEMBERED:REMEMBERED-SEMAPHORE:${key}`, {
				lockTimeout: 5000,
			});
			await mutex.acquire();
			const other = newTarget();
			setTimeout(() => {
				void other
					.updateCache(key, 'from-the-holder')
					.then(() => mutex.release());
			}, 200);

			const callback = jest.fn(async () => 'should-not-run');
			expect(await target.get(key, callback)).toBe('from-the-holder');
			expect(callback).not.toHaveBeenCalled();
		});

		it('should offload values through alternativePersistence and still read them back', async () => {
			const store = new Map<string, string | Buffer>();
			const alternative: AlternativePersistence = {
				save: async (k, content) => {
					store.set(k, content);
				},
				get: async (k) => store.get(k),
			};
			const altTarget = newTarget({ alternativePersistence: alternative });

			const callback = jest.fn(async () => ({ big: 'payload' }));
			expect(await altTarget.get(key, callback)).toEqual({ big: 'payload' });
			await eventually(async () => store.size === 1);

			// redis keeps only a small pointer for the alternative content
			const raw = await redis.get(redisKey(key));
			expect(typeof raw).toBe('string');
			expect((raw as string).length).toBeLessThanOrEqual(50);

			// readable back from another instance of the same persistence
			const altReader = newTarget({ alternativePersistence: alternative });
			expect(await altReader.get(key, callback)).toEqual({ big: 'payload' });
			expect(callback).toHaveBeenCalledTimes(1);
		});
	});

	describe('SWR stream surface', () => {
		const metaKeyOf = (k: string) => `REMEMBERED:${k}:stream-meta`;

		it('should stream a miss live, store it chunked, and replay from redis without the source', async () => {
			const items = Array.from({ length: 250 }, (_, i) => i);
			const callback = jest.fn(() => generate(items));

			expect(
				await collect(target.getSWRStream(key, callback, { chunkSize: 50 })),
			).toEqual(items);
			expect(callback).toHaveBeenCalledTimes(1);

			const gen = (await redis.hget(metaKeyOf(key), 'gen')) as string;
			expect(gen).toMatch(/^REMEMBERED:.*:stream-meta:/);
			expect(await redis.hlen(gen)).toBe(5);
			// each stored field holds at most chunkSize items
			const firstChunk = (await redis.hgetBuffer(gen, '0')) as Buffer;
			const decoded = (await gzipValueSerializer.deserialize(
				firstChunk,
			)) as number[];
			expect(decoded).toHaveLength(50);

			// replay: from a fresh instance, source untouched
			const fresh = newTarget();
			expect(
				await collect(fresh.getSWRStream(key, callback, { chunkSize: 50 })),
			).toEqual(items);
			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('should serve a stale snapshot completely while refreshing in background', async () => {
			const stale = [1, 2, 3];
			const fresh = [4, 5, 6];
			const callback = jest
				.fn()
				.mockImplementationOnce(() => generate(stale))
				.mockImplementation(() => generate(fresh));

			await collect(target.getSWRStream(key, callback, { ttl: 1 }));
			await delay(1200);
			expect(
				await collect(target.getSWRStream(key, callback, { ttl: 1 })),
			).toEqual(stale);
			await eventually(async () => {
				const meta = JSON.parse(
					(await redis.hget(metaKeyOf(key), 'meta')) as string,
				);
				return !!meta.prev;
			});
			expect(
				await collect(target.getSWRStream(key, callback, { ttl: 1 })),
			).toEqual(fresh);
			expect(callback).toHaveBeenCalledTimes(2);
		});

		it('should throw StreamIncompleteError when the cached generation vanishes mid-read', async () => {
			const items = Array.from({ length: 100 }, (_, i) => i);
			const callback = jest.fn(() => generate(items));
			await collect(target.getSWRStream(key, callback, { chunkSize: 10 }));

			// evict chunks 2+ from the stored generation (maxmemory stand-in)
			const gen = (await redis.hget(metaKeyOf(key), 'gen')) as string;
			await redis.hdel(gen, '2', '3', '4', '5', '6', '7', '8', '9');

			// an already damaged generation is a plain miss: the fresh read
			// cold-regenerates, delivering complete data from the source
			const second = newTarget();
			expect(
				await collect(second.getSWRStream(key, callback, { chunkSize: 10 })),
			).toEqual(items);
			expect(callback).toHaveBeenCalledTimes(2);

			// but a generation vanishing while a consumer is mid-delivery
			// throws at the breaking point, reporting what went out
			const freshGen = (await redis.hget(metaKeyOf(key), 'gen')) as string;
			const iterator = second
				.getSWRStream<number>(key, () => generate(items), { chunkSize: 10 })
				[Symbol.asyncIterator]();
			const seen: number[] = [];
			// two full chunks: the third fetch is the breaking point
			for (let i = 0; i < 20; i++) {
				seen.push((await iterator.next()).value as number);
			}
			await redis.del(freshGen);
			await expect(iterator.next()).rejects.toThrow(/20 items were delivered/);
			expect(seen).toEqual(items.slice(0, 20));
		});

		it('should not let clearCache be undone by a mid-flight refresh', async () => {
			const items = Array.from({ length: 20 }, (_, i) => i);
			const fresh = items.map((i) => i + 100);
			const callback = jest
				.fn()
				.mockImplementationOnce(() => generate(items))
				.mockImplementation(() => slowGenerate(fresh, 30));

			await collect(
				target.getSWRStream(key, callback, { chunkSize: 4, ttl: 1 }),
			);
			await delay(1200);
			expect(
				await collect(
					target.getSWRStream(key, callback, { chunkSize: 4, ttl: 1 }),
				),
			).toEqual(items);
			await delay(50); // refresh in flight
			await target.clearCache(key);
			await delay(800); // the refresh must have finished by now

			expect(await redis.exists(metaKeyOf(key))).toBe(0);
			expect(await collect(target.getSWRStream(key, callback))).toEqual(fresh);
		});

		it('should deliver large streams through a bounded window, never materializing the list', async () => {
			const total = 150000;
			const chunkSize = 500;
			const makeItem = (id: number) => ({
				id,
				name: `item-${id}-${'x'.repeat(480)}`,
				tags: ['alpha', 'beta', 'gamma', 'delta'],
			});
			// ~90MB when materialized: any implementation that buffers the
			// whole stream breaks the producer/consumer bounds asserted below
			// (RSS itself is not measurable reliably in-band)
			let produced = 0;
			let delivered = 0;
			let liveLead = 0;

			async function* source(): AsyncGenerator<ReturnType<typeof makeItem>> {
				for (let i = 0; i < total; i++) {
					produced++;
					yield makeItem(i);
					liveLead = Math.max(liveLead, produced - delivered);
				}
			}

			const consume = async (iterable: AsyncIterable<unknown>) => {
				let sum = 0;
				let count = 0;
				for await (const item of iterable) {
					count++;
					sum += (item as { id: number }).id;
					delivered++;
				}
				return { sum, count };
			};

			// live pass: the source generator must never run ahead of the
			// consumer — a buffering implementation drains it fully first
			const live = await consume(
				target.getSWRStream(key, source, { chunkSize }),
			);
			expect(live.count).toBe(total);
			expect(live.sum).toBe(((total - 1) * total) / 2);
			expect(liveLead).toBeLessThanOrEqual(1);

			// replay pass: windowing means the chunk fetcher may lead
			// consumption by at most one chunk, never fetch-all-then-yield
			const gen = (await redis.hget(metaKeyOf(key), 'gen')) as string;
			expect(await redis.hlen(gen)).toBe(total / chunkSize);
			let fetched = 0;
			delivered = 0;
			let fetchLead = 0;
			const counted = new Proxy(redis, {
				get(inst, prop, recv) {
					const value = Reflect.get(inst, prop, recv);
					if (prop === 'hgetBuffer') {
						return async (chunkKey: string, field: string) => {
							if (chunkKey === gen) {
								fetched++;
								fetchLead = Math.max(
									fetchLead,
									fetched - delivered / chunkSize,
								);
							}
							return value.call(inst, chunkKey, field);
						};
					}
					return typeof value === 'function' ? value.bind(inst) : value;
				},
			});
			const windowed = new RememberedRedis(
				{ ttl: 1000, redisTtl: 100000, redisPrefix: 'REMEMBERED' },
				counted as Redis,
			);
			const unusedSource = jest.fn(source);

			const replay = await consume(
				windowed.getSWRStream(key, unusedSource, { chunkSize }),
			);
			expect(replay.count).toBe(total);
			expect(replay.sum).toBe(((total - 1) * total) / 2);
			expect(unusedSource).not.toHaveBeenCalled();
			expect(fetchLead).toBeLessThanOrEqual(1.5);
		}, 60000);

		it('should deliver everything live when redis is unavailable', async () => {
			const deadRedis = new Redis(8888, 'localhost', {
				commandTimeout: 100,
				maxRetriesPerRequest: 1,
				lazyConnect: true,
			});
			const broken = newTarget({ redisTimeout: 150 }, deadRedis);
			const items = Array.from({ length: 30 }, (_, i) => i);

			expect(
				await collect(broken.getSWRStream(key, () => generate(items))),
			).toEqual(items);
			await deadRedis.quit().catch(() => undefined);
		});
	});
});
