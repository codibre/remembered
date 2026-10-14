import Redis, { Redis as RedisType } from 'ioredis';
import { Mutex } from 'redis-semaphore';
import { RememberedRedis, StreamIncompleteError } from '../../src';
import { promisify } from 'util';
import { v4 } from 'uuid';
import { gzipValueSerializer } from '../../src/gzip-value-serializer';
import { valueSerializer } from '../../src/value-serializer';

const delay = promisify(setTimeout);

async function* generate<T>(items: T[], failAfter?: number) {
	let i = 0;
	for (const item of items) {
		if (failAfter !== undefined && i >= failAfter) {
			throw new Error('source failure');
		}
		yield item;
		i++;
	}
}

async function* slowGenerate<T>(items: T[], ms: number) {
	for (const item of items) {
		await delay(ms);
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
		await delay(50);
	}
}

describe('getSWRStream', () => {
	let redis: RedisType;
	let target: RememberedRedis;
	let key: string;
	let metaKey: string;

	const currentGen = async () => await redis.hget(metaKey, 'gen');
	const currentMeta = async () => {
		return JSON.parse((await redis.hget(metaKey, 'meta')) as string) as {
			chunks: number;
			chunkSize: number;
			ttl: number;
			maxLifetime: number;
			prev?: string;
		};
	};

	beforeAll(() => {
		redis = new Redis();
	});

	afterAll(async () => {
		await redis.quit();
	});

	beforeEach(() => {
		key = v4();
		target = new RememberedRedis(
			{
				ttl: 1000,
				redisTtl: 1000000,
				redisPrefix: 'REMEMBERED',
			},
			redis,
		);
		metaKey = target['getRedisKey'](`${key}:stream-meta`);
	});

	afterEach(async () => {
		await redis.flushdb();
	});

	it('should call the callback and yield all items in order, storing chunks in a generation hash with pointer+meta', async () => {
		const items = Array.from({ length: 12 }, (_, i) => i);
		const callback = jest.fn(() => generate(items));

		const result = await collect(
			target.getSWRStream(key, callback, { chunkSize: 5 }),
		);

		expect(result).toEqual(items);
		expect(callback).toHaveBeenCalledTimes(1);

		const genKey = (await currentGen()) as string;
		expect(genKey).toBeTruthy();
		const fields = await redis.hkeys(genKey);
		expect(fields.sort()).toEqual(['0', '1', '2']);

		const meta = await currentMeta();
		expect(meta.chunks).toBe(3);

		expect(
			await gzipValueSerializer.deserialize(
				(await redis.hgetBuffer(genKey, '0')) as Buffer,
			),
		).toEqual([0, 1, 2, 3, 4]);
		expect(
			await gzipValueSerializer.deserialize(
				(await redis.hgetBuffer(genKey, '2')) as Buffer,
			),
		).toEqual([10, 11]);

		// the generation lives until the serving horizon, not the freshness ttl
		expect(await redis.ttl(genKey)).toBeGreaterThan(80000);
		expect(await redis.ttl(metaKey)).toBeGreaterThan(80000);
	});

	it('should read the cached stream in order without calling the callback again', async () => {
		const items = Array.from({ length: 12 }, (_, i) => i);
		const callback = jest.fn(() => generate(items));

		await collect(target.getSWRStream(key, callback, { chunkSize: 5 }));
		const cached = await collect(
			target.getSWRStream(key, callback, { chunkSize: 5 }),
		);

		expect(cached).toEqual(items);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('should default to a chunk size of 500', async () => {
		const items = Array.from({ length: 501 }, (_, i) => i);
		const callback = jest.fn(() => generate(items));

		const result = await collect(target.getSWRStream(key, callback));

		expect(result).toEqual(items);
		const meta = await currentMeta();
		expect(meta.chunks).toBe(2);
	});

	it('should only fetch the next chunk when the consumer needs it', async () => {
		const items = Array.from({ length: 10 }, (_, i) => i);
		await collect(
			target.getSWRStream(key, () => generate(items), { chunkSize: 5 }),
		);

		const hgetBuffer = jest.spyOn(redis, 'hgetBuffer');
		const iterator = target
			.getSWRStream<number>(key, () => generate([]), { chunkSize: 5 })
			[Symbol.asyncIterator]();

		// consume first chunk entirely: only chunk '0' should be fetched
		for (let i = 0; i < 5; i++) {
			expect((await iterator.next()).value).toBe(i);
		}
		expect(hgetBuffer.mock.calls.map((c) => c[1])).toEqual(['0']);

		expect((await iterator.next()).value).toBe(5);
		expect(hgetBuffer.mock.calls.map((c) => c[1])).toEqual(['0', '1']);

		await iterator.return?.();
		hgetBuffer.mockRestore();
	});

	it('should compress chunks by default and not compress when compression is disabled', async () => {
		const items = Array.from({ length: 3 }, (_, i) => ({ v: `item-${i}` }));

		await collect(
			target.getSWRStream(key, () => generate(items), { chunkSize: 5 }),
		);
		let raw = (await redis.hgetBuffer(
			(await currentGen()) as string,
			'0',
		)) as Buffer;
		expect(await gzipValueSerializer.deserialize(raw)).toEqual(items);

		const key2 = v4();
		await collect(
			target.getSWRStream(key2, () => generate(items), {
				chunkSize: 5,
				compression: false,
			}),
		);
		raw = (await redis.hgetBuffer(
			(await redis.hget(
				target['getRedisKey'](`${key2}:stream-meta`),
				'gen',
			)) as string,
			'0',
		)) as Buffer;
		expect(await valueSerializer.deserialize(raw)).toEqual(items);
	});

	it('should store the options ttl as freshness metadata, keeping the horizon ttl on the keys', async () => {
		await collect(
			target.getSWRStream(key, () => generate([1, 2, 3]), { ttl: 30 }),
		);
		const meta = await currentMeta();
		expect(meta.ttl).toBe(30);
		// keys are swept by the horizon (24h default), not by freshness
		expect(await redis.ttl(metaKey)).toBeGreaterThan(30);
	});

	it('should cache an empty stream', async () => {
		const callback = jest.fn(() => generate([]));

		expect(await collect(target.getSWRStream(key, callback))).toEqual([]);
		expect(await collect(target.getSWRStream(key, callback))).toEqual([]);
		expect(callback).toHaveBeenCalledTimes(1);

		const meta = await currentMeta();
		expect(meta.chunks).toBe(0);
	});

	it('should publish nothing and rethrow when the source fails mid-generation', async () => {
		const callback = () => generate([1, 2, 3, 4, 5], 3);

		await expect(
			collect(target.getSWRStream(key, callback, { chunkSize: 2 })),
		).rejects.toThrow('source failure');

		expect(await redis.hgetall(metaKey)).toEqual({});
		// the unpublished generation was cleaned up as well
		const leftovers = await redis.keys(`REMEMBERED${key}*`);
		expect(leftovers).toEqual([]);
	});

	it('should only generate the stream once when two consumers request it concurrently', async () => {
		async function* slow() {
			for (let i = 0; i < 10; i++) {
				await delay(5);
				yield i;
			}
		}
		const callback = jest.fn(() => slow());

		const [a, b] = await Promise.all([
			collect(target.getSWRStream(key, callback)),
			collect(target.getSWRStream(key, callback)),
		]);

		expect(a).toEqual(Array.from({ length: 10 }, (_, i) => i));
		expect(b).toEqual(Array.from({ length: 10 }, (_, i) => i));
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('should serve the complete stale snapshot while refreshing in the background', async () => {
		const items = Array.from({ length: 8 }, (_, i) => i);
		const fresh = items.map((i) => i + 100);
		const callback = jest
			.fn()
			.mockImplementationOnce(() => generate(items))
			.mockImplementation(() => generate(fresh));

		await collect(target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }));
		const oldGen = (await currentGen()) as string;
		expect(callback).toHaveBeenCalledTimes(1);

		await delay(1200); // now stale

		// the stale read must return the COMPLETE OLD snapshot...
		const staleRead = await collect(
			target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
		);
		expect(staleRead).toEqual(items);

		// ...while the background refresh publishes the new generation
		await eventually(async () => (await currentGen()) !== oldGen);
		expect(callback).toHaveBeenCalledTimes(2);

		// the next read sees the fresh content
		const freshRead = await collect(
			target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
		);
		expect(freshRead).toEqual(fresh);
	});

	it('should only refresh once per stale stream, even with concurrent readers', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);
		const callback = jest.fn(() => generate(items));

		await collect(target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }));
		await delay(1200);

		await Promise.all([
			collect(target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 })),
			collect(target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 })),
			collect(target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 })),
		]);
		await delay(300);

		// one read + one background refresh, not one per reader
		expect(callback).toHaveBeenCalledTimes(2);
	});

	it('should keep serving the old snapshot when the background refresh fails', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);
		const callback = jest
			.fn()
			.mockImplementationOnce(() => generate(items))
			.mockImplementation(() => {
				throw new Error('source down');
			});

		await collect(target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }));
		const oldGen = (await currentGen()) as string;
		await delay(1200);

		// stale read: serves old data, triggers refresh, refresh fails...
		expect(
			await collect(
				target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
			),
		).toEqual(items);
		await delay(300);

		// ...without breaking the stream or moving the pointer
		expect(await currentGen()).toBe(oldGen);
		expect(
			await collect(
				target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
			),
		).toEqual(items);
	});

	it('should treat streams older than maxLifetime as a miss and regenerate', async () => {
		const items = Array.from({ length: 4 }, (_, i) => i);
		const fresh = items.map((i) => i + 100);
		const callback = jest
			.fn()
			.mockImplementationOnce(() => generate(items))
			.mockImplementation(() => generate(fresh));

		await collect(
			target.getSWRStream(key, callback, {
				chunkSize: 2,
				ttl: 1,
				maxLifetime: 1,
			}),
		);
		await delay(1200);

		expect(
			await collect(
				target.getSWRStream(key, callback, {
					chunkSize: 2,
					ttl: 1,
					maxLifetime: 1,
				}),
			),
		).toEqual(fresh);
		expect(callback).toHaveBeenCalledTimes(2);
	});

	it('should throw StreamIncompleteError when the cached generation vanishes mid-read', async () => {
		const items = Array.from({ length: 10 }, (_, i) => i);
		await collect(
			target.getSWRStream(key, () => generate(items), { chunkSize: 5 }),
		);
		const genKey = (await currentGen()) as string;

		const source = jest.fn(() => generate(items));
		const iterator = target
			.getSWRStream<number>(key, source, { chunkSize: 5 })
			[Symbol.asyncIterator]();

		// consume the first chunk entirely
		const seen: number[] = [];
		for (let i = 0; i < 5; i++) {
			seen.push((await iterator.next()).value as number);
		}
		expect(seen).toEqual([0, 1, 2, 3, 4]);

		// the generation gets evicted between chunk fetches
		await redis.del(genKey);

		// completing the delivery would mean trusting a positional
		// re-traversal of the source, so the read throws at the breaking
		// point instead, reporting exactly what went out
		let thrown: unknown;
		try {
			await iterator.next();
		} catch (err) {
			thrown = err;
		}
		expect(thrown).toBeInstanceOf(StreamIncompleteError);
		expect((thrown as StreamIncompleteError).deliveredCount).toBe(5);
		expect((thrown as Error).message).toContain('5 items were delivered');
		// no positional re-traversal of the source was attempted
		expect(source).not.toHaveBeenCalled();
	});

	it('should not delete the cached stream when a consumer gets the iterable and never iterates it', async () => {
		const items = Array.from({ length: 7 }, (_, i) => i);
		const callback = jest.fn(() => generate(items));

		await collect(target.getSWRStream(key, callback, { chunkSize: 3 }));

		// a code path that requests the stream and drops it must not delete
		// anything
		target.getSWRStream(key, callback, { chunkSize: 3 });
		await delay(10);

		expect(
			await collect(target.getSWRStream(key, callback, { chunkSize: 3 })),
		).toEqual(items);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('should renew the horizon ttl while a consumer reads it', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);
		await collect(
			target.getSWRStream(key, () => generate(items), {
				chunkSize: 3,
				maxLifetime: 120,
			}),
		);
		const genKey = (await currentGen()) as string;
		await redis.expire(genKey, 60); // simulate ttl having counted down

		const iterator = target
			.getSWRStream<number>(key, () => generate(items), {
				chunkSize: 3,
				maxLifetime: 120,
			})
			[Symbol.asyncIterator]();
		expect((await iterator.next()).value).toBe(0);
		// crossing into chunk 1 renews the horizon back to maxLifetime
		expect((await iterator.next()).value).toBe(1);
		expect(await redis.ttl(genKey)).toBeGreaterThan(110);

		for (;;) {
			const { done } = await iterator.next();
			if (done) {
				break;
			}
		}
	});

	it('should clear the stream entirely on clearCache', async () => {
		const items = [1, 2, 3];
		await collect(
			target.getSWRStream(key, () => generate(items), { chunkSize: 2 }),
		);
		const genKey = (await currentGen()) as string;

		await target.clearCache(key);

		expect(await redis.exists(metaKey)).toBe(0);
		expect(await redis.exists(genKey)).toBe(0);

		const callback = jest.fn(() => generate(items));
		expect(
			await collect(target.getSWRStream(key, callback, { chunkSize: 2 })),
		).toEqual(items);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('should not resurrect a cleared stream when a refresh was mid-flight', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);
		const refreshed = items.map((i) => i + 100);
		const callback = jest
			.fn()
			.mockImplementationOnce(() => generate(items))
			.mockImplementation(() => slowGenerate(refreshed, 40));

		await collect(target.getSWRStream(key, callback, { chunkSize: 2, ttl: 1 }));
		expect(callback).toHaveBeenCalledTimes(1);
		await delay(1200); // now stale

		// stale read serves the old snapshot and starts a slow background
		// refresh that is still generating when the clear happens
		const stalePromise = collect(
			target.getSWRStream(key, callback, { chunkSize: 2, ttl: 1 }),
		);
		expect(await stalePromise).toEqual(items);
		await delay(60); // refresh in flight, nothing published yet
		await target.clearCache(key);

		// the in-flight refresh must not publish its older snapshot
		await delay(600);
		expect(await redis.exists(metaKey)).toBe(0);
		const [, keys] = await redis.scan(
			0,
			'MATCH',
			`REMEMBERED:${key}:stream-meta:*`,
			'COUNT',
			100,
		);
		// generation hashes are named meta:uuid; the tombstone hash is a
		// distinct key, so anything left here is a resurrected generation
		expect(keys.filter((k) => k !== `${metaKey}:cleared`)).toEqual([]);

		// the next read is a miss: regenerated fresh from the source
		expect(await collect(target.getSWRStream(key, callback))).toEqual(
			refreshed,
		);
	});

	it('should not resurrect a cleared stream when a first generation was mid-flight', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);
		const callback = jest.fn(() => slowGenerate(items, 40));

		const reading = collect(target.getSWRStream(key, callback));
		await delay(120); // generating, nothing published yet
		await target.clearCache(key);
		// already-delivered items cannot be un-delivered, but nothing more is
		// stored once the clear is observed
		expect((await reading).length).toBeGreaterThan(0);

		await delay(400);
		expect(await redis.exists(metaKey)).toBe(0);
	});

	it('should skip the background refresh when another process holds the revalidation lock', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);
		const fresh = items.map((i) => i + 100);
		const callback = jest
			.fn()
			.mockImplementationOnce(() => generate(items))
			.mockImplementation(() => generate(fresh));

		await collect(target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }));
		const oldGen = (await currentGen()) as string;
		await delay(1200); // now stale

		// simulate another process already revalidating: a real mutex on the
		// same lock the soft mutex takes (redis-semaphore namespaces its
		// keys internally, so it must be built through the library itself)
		const other = new Mutex(redis, `${metaKey}:revalidate`, {
			lockTimeout: 2000,
		});
		await other.acquire();

		// stale read still serves the old snapshot, but forgets the refresh
		expect(
			await collect(
				target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
			),
		).toEqual(items);
		await delay(400);
		expect(callback).toHaveBeenCalledTimes(1);
		expect(await currentGen()).toBe(oldGen);

		// with the lock gone, the next stale read revalidates normally
		await other.release();
		expect(
			await collect(
				target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
			),
		).toEqual(items);
		await eventually(async () => (await currentGen()) !== oldGen);
		expect(callback).toHaveBeenCalledTimes(2);
		expect(await collect(target.getSWRStream(key, callback))).toEqual(fresh);
	});

	it('should reclaim a superseded generation once it goes idle past the grace, protecting active readers', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);
		const fresh = items.map((i) => i + 100);
		const callback = jest
			.fn()
			.mockImplementationOnce(() => generate(items))
			.mockImplementation(() => generate(fresh));

		await collect(target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }));
		await delay(1200); // stale: the refresh swaps in a new generation
		expect(
			await collect(
				target.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
			),
		).toEqual(items);
		await eventually(async () => !!(await currentMeta()).prev);
		const oldGen = (await currentMeta()).prev as string;

		// the old generation was just touched: its ttl is fresh, so reads
		// treat it as still consumed and leave it alone
		await collect(target.getSWRStream(key, callback, { chunkSize: 3 }));
		await delay(200);
		expect(await redis.exists(oldGen)).toBe(1);

		// age it artificially: a ttl 60s from death, far behind the 24h
		// horizon it is renewed to, reads must treat it as idle garbage.
		// Without reclamation it would survive that whole minute
		await redis.pexpire(oldGen, 60000);

		// a new read is the opportunity to clear it
		expect(await collect(target.getSWRStream(key, callback))).toEqual(fresh);
		await eventually(async () => (await redis.exists(oldGen)) === 0);
		// and the reclaim is idempotent afterwards
		expect(await collect(target.getSWRStream(key, callback))).toEqual(fresh);
	});

	it('should not duplicate generation when a second instance waited on the semaphore', async () => {
		const items = Array.from({ length: 10 }, (_, i) => i);
		async function* slow() {
			for (const item of items) {
				await delay(10);
				yield item;
			}
		}
		const callbackA = jest.fn(() => slow());
		const callbackB = jest.fn(() => slow());
		const targetB = new RememberedRedis(
			{
				ttl: 1000,
				redisTtl: 1000000,
				redisPrefix: 'REMEMBERED',
			},
			redis,
		);

		const [a, b] = await Promise.all([
			collect(target.getSWRStream(key, callbackA, { chunkSize: 3 })),
			(async () => {
				await delay(15);
				return await collect(
					targetB.getSWRStream(key, callbackB, { chunkSize: 3 }),
				);
			})(),
		]);

		expect(a).toEqual(items);
		expect(b).toEqual(items);
		expect(callbackA).toHaveBeenCalledTimes(1);

		const callbackC = jest.fn(() => generate(items));
		expect(
			await collect(targetB.getSWRStream(key, callbackC, { chunkSize: 3 })),
		).toEqual(items);
		expect(callbackC).not.toHaveBeenCalled();
	});

	it('should deliver complete uncached when redis refuses chunk writes mid-delivery', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);

		// refusal starts at the first chunk write: two items were already
		// delivered live from the source; delivery must NOT throw, it
		// simply continues from the source with caching abandoned
		const spy = jest.spyOn(redis, 'hset').mockImplementation((async (
			keyArg: string,
		) => {
			if (keyArg.startsWith(metaKey)) {
				throw new Error(
					"OOM command not allowed when used memory > 'maxmemory'.",
				);
			}
			return 1;
		}) as never);
		try {
			expect(
				await collect(
					target.getSWRStream(key, () => generate(items), {
						chunkSize: 2,
					}),
				),
			).toEqual(items);
		} finally {
			spy.mockRestore();
		}

		// the partial generation was evicted; nothing was published
		expect(await redis.exists(metaKey)).toBe(0);
		const [, keys] = await redis.scan(
			0,
			'MATCH',
			`REMEMBERED:${key}:stream-meta:*`,
			'COUNT',
			100,
		);
		expect(keys).toEqual([]);
	});

	it('should deliver complete uncached when the safe-redis breaker swallows write failures', async () => {
		// with redisTimeout set, hset failures come back as undefined:
		// the pass degrades to uncached delivery without throwing
		const spy = jest
			.spyOn(redis, 'hset')
			.mockRejectedValue(
				new Error("OOM command not allowed when used memory > 'maxmemory'."),
			);
		try {
			const timed = new RememberedRedis(
				{
					ttl: 1000,
					redisTtl: 1000000,
					redisPrefix: 'REMEMBERED',
					redisTimeout: 300,
				},
				redis,
			);
			expect(
				await collect(
					timed.getSWRStream(key, () => generate([1, 2, 3, 4]), {
						chunkSize: 2,
					}),
				),
			).toEqual([1, 2, 3, 4]);
		} finally {
			spy.mockRestore();
		}
		expect(await redis.exists(metaKey)).toBe(0);
	});

	it('should cold-regenerate without delivering anything when the cached generation vanished before the read', async () => {
		const items = Array.from({ length: 10 }, (_, i) => i);
		await collect(
			target.getSWRStream(key, () => generate(items), { chunkSize: 5 }),
		);
		const genKey = (await currentGen()) as string;

		// nobody has read from this pointer yet: losing it is a plain miss
		await redis.del(genKey);

		const callback = jest.fn(() => generate(items));
		expect(
			await collect(target.getSWRStream(key, callback, { chunkSize: 5 })),
		).toEqual(items);
		expect(callback).toHaveBeenCalledTimes(1);
		const newGenKey = (await currentGen()) as string;
		expect(newGenKey).not.toBe(genKey);
	});

	it('should cold-regenerate a generation damaged before the read, without delivering a poisoned prefix', async () => {
		const items = Array.from({ length: 10 }, (_, i) => i);
		await collect(
			target.getSWRStream(key, () => generate(items), { chunkSize: 5 }),
		);
		const genKey = (await currentGen()) as string;

		// eviction nibbled the generation before anybody read it
		await redis.hdel(genKey, '1');

		const callback = jest.fn(() => generate(items));
		expect(
			await collect(target.getSWRStream(key, callback, { chunkSize: 5 })),
		).toEqual(items);
		expect(callback).toHaveBeenCalledTimes(1);
	});

	it('should cold-regenerate when writes fail during a generation, delivering complete uncached', async () => {
		const items = Array.from({ length: 10 }, (_, i) => i);

		// every stream write is refused: the cold pass must deliver the
		// full stream from the source and abandon caching entirely
		const spy = jest.spyOn(redis, 'hset').mockImplementation((async (
			keyArg: string,
		) => {
			if (keyArg.startsWith(metaKey)) {
				throw new Error(
					"OOM command not allowed when used memory > 'maxmemory'.",
				);
			}
			return 1;
		}) as never);
		try {
			expect(
				await collect(
					target.getSWRStream(key, () => generate(items), {
						chunkSize: 5,
					}),
				),
			).toEqual(items);
		} finally {
			spy.mockRestore();
		}
		// nothing partial was left behind
		const [, genKeys] = await redis.scan(
			0,
			'MATCH',
			`${metaKey}:*`,
			'COUNT',
			100,
		);
		expect(genKeys).toEqual([]);
	});

	it('should run the revalidation soft lock through the configured semaphore', async () => {
		const items = Array.from({ length: 6 }, (_, i) => i);
		const fresh = items.map((i) => i + 100);
		const callback = jest
			.fn()
			.mockImplementationOnce(() => generate(items))
			.mockImplementation(() => generate(fresh));

		// a semaphore whose tryAcquire says "someone else holds it": the
		// refresh must be forgotten, never queued, and never reach the
		// internal default mutex
		let taken = true;
		const tryAcquire = jest.fn(async () =>
			taken ? undefined : async () => undefined,
		);
		const targetC = new RememberedRedis(
			{
				ttl: 1000,
				redisTtl: 1000000,
				redisPrefix: 'REMEMBERED',
				semaphore: {
					acquire: async () => async () => undefined,
					tryAcquire,
				},
			},
			redis,
		);

		await collect(
			targetC.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
		);
		const oldGen = (await currentGen()) as string;
		await delay(1200); // now stale

		expect(
			await collect(
				targetC.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
			),
		).toEqual(items);
		await delay(400);
		expect(tryAcquire).toHaveBeenCalled();
		expect(callback).toHaveBeenCalledTimes(1);
		expect(await currentGen()).toBe(oldGen);

		// lock free again: the next stale read revalidates through it and
		// releases afterwards
		taken = false;
		expect(
			await collect(
				targetC.getSWRStream(key, callback, { chunkSize: 3, ttl: 1 }),
			),
		).toEqual(items);
		await eventually(async () => (await currentGen()) !== oldGen);
		expect((await currentMeta()).chunks).toBe(2);
	});
});
