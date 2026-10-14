import { v4 } from 'uuid';
import { Remembered } from 'remembered';
import { LockOptions, Mutex } from 'redis-semaphore';
import {
	RememberedRedisConfig,
	TryTo,
	AlternativePersistence,
	StreamOptions,
} from './remembered-redis-config';
import {
	getSemaphoreConfig,
	RedisLike,
	RequiredField,
} from './get-semaphore-config';
import { getRedisPrefix } from './get-redis-prefix';
import { tryToFactory } from './try-to-factory';
import { gzipValueSerializer } from './gzip-value-serializer';
import { valueSerializer } from './value-serializer';
import { promisify } from 'util';
import clone from 'clone';
import { getSafeRedis } from './get-safe-redis';
import { dontWaitFactory } from './dont-wait';
import { Redis } from 'ioredis';

const delay = promisify(setTimeout);

export const DEFAULT_LOCK_TIMEOUT = 10000;
export const DEFAULT_ACQUIRE_TIMEOUT = 60000;
export const DEFAULT_RETRY_INTERVAL = 100;
export const DEFAULT_REFRESH_INTERVAL = 8000;
export const DEFAULT_STREAM_CHUNK_SIZE = 500;
export const DEFAULT_STREAM_MAX_LIFETIME = 86400; // 24h
const MS_PER_SECOND = 1000;
export const DEFAULT_STREAM_MAX_RECOVERIES = 3;
/** Grace after which a superseded generation, idle for that long, is
 * reclaimed by the next reader instead of waiting for the ttl sweeper */
export const DEFAULT_STREAM_RETIRE_GRACE = 600;
const MAX_STREAM_GENERATION_ATTEMPTS = 5;
export const EMPTY = Symbol('Empty');
const STREAM_META_FIELD = 'meta';
const STREAM_REVALIDATE_SUFFIX = ':revalidate';
/** PTTL return for a missing key (already reclaimed: nothing to do) */
const PTTL_ABSENT = -2;
/** PTTL return for an existing key without ttl (orphan: reclaim it) */
const PTTL_UNLIMITED = -1;
/**
 * The background revalidation soft mutex: try once, and if it is taken,
 * somebody (possibly another process) is already revalidating, so this
 * refresh is simply skipped. The lockTimeout lease frees it if the holder
 * dies mid-refresh.
 */
const REVALIDATION_LOCK_ACQUIRE_TIMEOUT = 50;

const STREAM_POINTER_FIELD = 'gen';
/**
 * Suffix of the short-lived marker recording the moment a stream was
 * explicitly cleared. A refresh that started before the clear must not
 * resurrect the stream afterwards, so publishes check against this
 * tombstone and are dropped when superseded.
 */
const STREAM_CLEARED_SUFFIX = ':cleared';
const STREAM_CLEARED_FIELD = 'at';
const STREAM_CLEAR_TOMBSTONE_TTL = 3600; // 1h

const STREAM_META_SUFFIX = ':stream-meta';

/**
 * Internal signal that a stream generation became unreadable (expired or
 * evicted) mid-read. Never reaches consumers: getSWRStream regenerates
 * from the source and resumes delivery from the exact position instead.
 */
class StreamLostError extends Error {
	constructor(genKey: string) {
		super(`Remembered stream generation ${genKey} is gone`);
		this.name = 'StreamLostError';
	}
}

interface StreamMetaFields {
	chunks: number;
	/**
	 * Pointer to the generation this stream superseded at publish time,
	 * reclaimed opportunistically by readers when idle past the grace
	 */
	prev?: string;
	chunkSize: number;
	compression: boolean;
	ttl: number;
	maxLifetime: number;
	createdAt: number;
}

interface StreamMeta extends StreamMetaFields {
	genKey: string;
}

/**
 * Per consumer iterator, how many items have effectively gone out, so a
 * mid-read stream loss can be recovered by resuming at this exact position.
 */
interface Delivered {
	pos: number;
}
const resolved = Promise.resolve();

interface SavingObjects {
	fulfilled: boolean;
	entries: Map<string, [number, unknown]>;
}

function prepareConfig(config: RememberedRedisConfig) {
	const { redisTtl, ttl } = config;

	if (!redisTtl) {
		config.ttl = 0;
	} else if (typeof redisTtl === 'function') {
		const fTtl = typeof ttl === 'number' ? () => ttl : ttl;
		config.ttl = ((r: unknown) => {
			const rTtl = redisTtl(r as string);

			return rTtl
				? Math.min(typeof fTtl === 'function' ? fTtl(r as string) : fTtl, rTtl)
				: 0;
		}) as any;
	} else if (typeof ttl === 'number') {
		config.ttl = redisTtl ? Math.min(ttl, redisTtl) : 0;
	} else {
		config.ttl = ((t: unknown) => {
			const bTtl = ttl(t as string);

			return bTtl && redisTtl ? Math.min(bTtl, redisTtl) : 0;
		}) as any;
	}

	return config;
}

const MAX_ALTERNATIVE_KEY_SIZE = 50;
const TTL_MAP_POS = 2;

export class RememberedRedis extends Remembered {
	private readonly semaphoreConfig: LockOptions;
	private readonly redisPrefix: string;
	private readonly redisTtl?: <T>(r: T) => number;
	private readonly tryTo: TryTo;
	private readonly dontWait: ReturnType<typeof dontWaitFactory>;
	private readonly onCache?: (key: string) => void;
	private readonly onError?: (key: string, err: Error) => any;
	private readonly alternativePersistence?: AlternativePersistence;
	private savingObjects?: SavingObjects;
	private waitSaving = false;
	private savingPromise?: Promise<unknown>;
	private readonly streamGeneration = new Map<string, Promise<void>>();
	private readonly streamRefreshing = new Set<string>();
	private readonly redis: RedisLike;

	constructor(
		settings: RequiredField<RememberedRedisConfig, 'semaphore'>,
		redis: RedisLike,
	);
	constructor(settings: Omit<RememberedRedisConfig, 'semaphore'>, redis: Redis);
	constructor(settings: RememberedRedisConfig, redis: Redis);
	constructor(
		private settings: RememberedRedisConfig,
		redis: RedisLike,
	) {
		super(prepareConfig(settings));
		this.redisTtl =
			typeof settings.redisTtl === 'number'
				? () => settings.redisTtl as number
				: (settings.redisTtl as any);
		this.tryTo = tryToFactory(settings.logError);
		this.dontWait = dontWaitFactory(settings.logError, this.tryTo);
		this.semaphoreConfig = getSemaphoreConfig(settings);
		this.redisPrefix = getRedisPrefix(settings.redisPrefix);
		this.onCache = settings.onCache;
		this.onError = settings.onError;
		this.alternativePersistence = settings.alternativePersistence;
		this.redis = getSafeRedis(redis, settings.onError, settings.redisTimeout);
	}

	async blockingGet<T>(
		key: string,
		callback: () => PromiseLike<T>,
		noCacheIf?: ((result: T) => boolean) | undefined,
		ttl?: number | undefined,
	): Promise<T> {
		return await super.blockingGet(
			key,
			() =>
				this.tryCache(key, () => this.getResult(key, callback, noCacheIf, ttl)),
			noCacheIf,
		);
	}

	async getFromCache<T>(
		key: string,
		noSemaphore = false,
	): Promise<T | typeof EMPTY> {
		const release = noSemaphore ? undefined : await this.acquire(key);
		try {
			return await this.getFromCacheInternal(key, false);
		} finally {
			release?.();
		}
	}

	async runAndCache<T>(
		key: string,
		callback: () => PromiseLike<T>,
		noCacheIf?: ((result: T) => boolean) | undefined,
		ttl?: number,
	): Promise<T> {
		const release = await this.acquire(key);
		try {
			const result = await callback();
			if (result !== undefined && !noCacheIf?.(result)) {
				await this.updateCache(key, result, ttl);
			}
			return result;
		} finally {
			release?.();
		}
	}

	/**
	 * Returns a stale-while-revalidate (SWR) remembered stream: an
	 * AsyncIterable of the items produced by the callback, chunked into
	 * Redis, so large lists don't need to fit in memory at the same time.
	 *
	 * The name says it: SWR is the stale-while-revalidate caching
	 * semantics of RFC 5861, applied to remembered streams: a stored stream is
	 * delivered complete (chunk by chunk, lazily) while, if it got stale
	 * (older than the freshness ttl), a single background task per stream
	 * regenerates it from the source and atomically swaps the pointer when
	 * done. Streams never hard-expire while consumable: ttl is a freshness
	 * marker in the metadata, not a Redis execution ttl; maxLifetime is the
	 * serving horizon, and Redis ttls are only crash/orphan sweepers. A
	 * stream older than maxLifetime is treated as a miss and regenerated
	 * before serving.
	 *
	 * Cache instability is absorbed: if the current generation expires or is
	 * evicted mid-read, getSWRStream regenerates from the source and
	 * resumes delivery from the exact position the consumer stopped at —
	 * delivery stays complete and ordered, and no item is ever re-delivered
	 * to the same iterator.
	 *
	 * Trade-offs (eventual consistency):
	 * - while a revalidation runs, the superseded generation coexists with
	 *   the new one: peak storage is ~2x the stream, bounded at 2x by the
	 *   single-revalidation soft lock;
	 * - a background refresh means a read may serve the previous snapshot
	 *   for one more full pass;
	 * - each revalidation is a complete source traversal (no incremental
	 *   regeneration): one full callback() pass per freshness window in
	 *   steady state, more only with eviction-triggered resumptions;
	 * - resume after loss is positional, so a source that added, removed or
	 *   reordered items around the breaking point can deliver items added
	 *   before it, or repeat/skip moved items around it;
	 * - recovery is capped by maxRecoveries, so a permanently lost stream
	 *   with a permanently failing source surfaces as that source's error.
	 * Cross-process coordination is soft by design: only one revalidation
	 * runs at a time (try-once redis mutex lease, forgotten when taken),
	 * and a superseded generation is reclaimed by any read that finds it
	 * idle past retireGrace — the generation ttl, renewed on every touch,
	 * is what tells "someone is consuming it" from garbage. Failed
	 * reclamation or missed locks degrade to the ttl sweeper, never to
	 * corruption.
	 * A clearCache() during generation never resurrects: publishes check
	 * against a short-lived clear tombstone and are dropped if superseded.
	 *
	 * @param key the remembering key, for remembering purposes
	 * @param callback the source of items, in case nothing is remembered
	 * @param options the stream options: chunkSize (defaults to 500), ttl
	 * (freshness window in seconds, defaults to the instance redisTtl),
	 * compression (defaults to the instance setting), maxLifetime (serving
	 * horizon in seconds, defaults to 24h), maxRecoveries (defaults to 3)
	 * and retireGrace (seconds an idle superseded generation waits before
	 * being reclaimed, defaults to 10min)
	 * @returns the (now) remembered async iterable
	 */
	getSWRStream<T>(
		key: string,
		callback: () => AsyncIterable<T>,
		options: StreamOptions = {},
	): AsyncIterable<T> {
		return {
			[Symbol.asyncIterator]: () =>
				this.iterateStream<T>(key, callback, options),
		};
	}

	private async *iterateStream<T>(
		key: string,
		callback: () => AsyncIterable<T>,
		options: StreamOptions,
	): AsyncGenerator<T> {
		const metaKey = this.getRedisKey(`${key}${STREAM_META_SUFFIX}`);
		const delivered = { pos: 0 };
		const maxRecoveries =
			options.maxRecoveries ?? DEFAULT_STREAM_MAX_RECOVERIES;
		const maxIterations = MAX_STREAM_GENERATION_ATTEMPTS + maxRecoveries + 2;
		let recoveries = 0;

		for (let iteration = 0; iteration < maxIterations; iteration++) {
			const meta = await this.readStreamMeta(metaKey);
			if (meta) {
				if (this.isStreamExpired(meta)) {
					// past the serving horizon: regenerate before serving
					await this.try(metaKey, () => this.redis.del(metaKey, meta.genKey));
				} else {
					if (this.isStreamStale(meta)) {
						this.scheduleBackgroundRefresh(key, metaKey, callback, options);
					}
					// a read that starts with two generations in play is an
					// opportunity to reclaim the superseded one
					this.tryReclaimSuperseded(meta, options);
					try {
						yield* this.readStreamChunks<T>(meta, delivered);
						return;
					} catch (err) {
						if (!(err instanceof StreamLostError)) {
							throw err;
						}
						if (recoveries++ >= maxRecoveries) {
							throw new Error(
								`Remembered stream ${key} was lost ${recoveries} times while being read`,
							);
						}
						if (delivered.pos === 0) {
							// dead pointer, nothing delivered: clean it so a
							// failed regeneration does not leave readers on it
							await this.try(metaKey, () => this.redis.del(metaKey));
						}
					}
				}
			}

			let status = this.streamGeneration.get(metaKey);
			if (status) {
				// another consumer (in this process) is generating: wait, then
				// loop back to read what it produced (or retry if it failed)
				await status.catch(() => undefined);
				continue;
			}
			let resolveStatus!: () => void;
			status = new Promise<void>((resolve) => {
				resolveStatus = resolve;
			});
			this.streamGeneration.set(metaKey, status);
			try {
				const streamedAll = yield* this.generateStream<T>(
					key,
					metaKey,
					callback,
					options,
					delivered,
					false,
				);
				if (streamedAll) {
					// the live generation streamed in full to this consumer
					return;
				}
			} finally {
				if (this.streamGeneration.get(metaKey) === status) {
					this.streamGeneration.delete(metaKey);
				}
				resolveStatus();
			}
			// a generation was published: loop back and continue from the
			// delivered position
		}
		throw new Error(
			`Could not remember stream for key ${key} after ${maxIterations} attempts`,
		);
	}

	private isStreamStale(meta: StreamMeta) {
		return Date.now() - meta.createdAt >= meta.ttl * MS_PER_SECOND;
	}

	private isStreamExpired(meta: StreamMeta) {
		return Date.now() - meta.createdAt >= meta.maxLifetime * MS_PER_SECOND;
	}

	/**
	 * Tries the revalidation soft lock once, through the configured
	 * semaphore abstraction when it implements tryAcquire, falling back to
	 * an internal redis-semaphore Mutex otherwise. Resolves to a release
	 * callback when the lock was taken, or undefined when it is taken or
	 * unavailable: somebody (possibly another process) is already doing
	 * the job, or redis is broken, so this refresh is simply forgotten and
	 * a later stale read tries again.
	 */
	private async tryRevalidationLock(
		key: string,
		lockKey: string,
	): Promise<(() => PromiseLike<unknown>) | undefined> {
		const { semaphore } = this.settings;
		if (semaphore?.tryAcquire) {
			const release = await this.tryTo(() => semaphore.tryAcquire!(lockKey));
			return release ? () => release() : undefined;
		}
		// default behavior: internal redis-semaphore Mutex. The lock lease
		// (refreshed while held) frees it if the holder dies
		const mutex = new Mutex(this.redis as Redis, lockKey, {
			...this.semaphoreConfig,
			acquireTimeout: REVALIDATION_LOCK_ACQUIRE_TIMEOUT,
			onLockLost: (err) => this.settings.onLockLost?.(key, err),
		});
		const acquired = await this.tryTo(() => mutex.tryAcquire());
		if (!acquired) {
			return undefined;
		}
		return () => mutex.release();
	}

	/**
	 * Kicks off at most one background refresh per stream, process-wide:
	 * rebuilds silently into a new generation and atomically swaps the meta
	 * pointer. Readers on the old generation are never interrupted; it is
	 * swept by its own horizon ttl afterwards.
	 */
	private scheduleBackgroundRefresh<T>(
		key: string,
		metaKey: string,
		callback: () => AsyncIterable<T>,
		options: StreamOptions,
	) {
		if (this.streamRefreshing.has(metaKey)) {
			return;
		}
		this.streamRefreshing.add(metaKey);
		this.dontWait(async () => {
			let release: (() => PromiseLike<unknown>) | undefined;
			try {
				const meta = await this.readStreamMeta(metaKey);
				if (!meta || this.isStreamExpired(meta) || !this.isStreamStale(meta)) {
					return;
				}
				// soft revalidation mutex: try once and, if it is taken,
				// forget this refresh (see tryRevalidationLock)
				release = await this.tryRevalidationLock(
					key,
					`${metaKey}${STREAM_REVALIDATE_SUFFIX}`,
				);
				if (!release) {
					return;
				}
				try {
					// whoever held the lock may have just published: only
					// revalidate what is still stale
					const current = await this.readStreamMeta(metaKey);
					if (
						!current ||
						this.isStreamExpired(current) ||
						!this.isStreamStale(current)
					) {
						return;
					}
					// silent production: nobody consumes it; the pointer swap
					// is the only visible effect
					await this.produceStream(
						key,
						metaKey,
						callback,
						options,
						{ pos: 0 },
						true,
					);
				} finally {
					await this.tryTo(release);
				}
			} finally {
				this.streamRefreshing.delete(metaKey);
			}
		});
	}

	/**
	 * Generates a fresh generation hash and atomically publishes it in the
	 * meta hash (pointer + metadata in a single HSET). Modes:
	 * - live first pass (nothing delivered): items stream to the consumer
	 *   while being stored (returns true when fully delivered live);
	 * - recovery (delivered > 0): the full sequence is stored; the already
	 *   delivered prefix is skipped by the read path, so the same iterator
	 *   resumes without gaps or repetitions (returns false);
	 * - silent (background refresh): nothing is yielded, the pointer swap
	 *   publishes it (returns false).
	 */
	private async *generateStream<T>(
		key: string,
		metaKey: string,
		callback: () => AsyncIterable<T>,
		options: StreamOptions,
		delivered: Delivered,
		silent: boolean,
	): AsyncGenerator<T, boolean> {
		const release = await this.acquire(key);
		const startedAt = Date.now();
		const genKey = `${metaKey}:${v4()}`;
		let created = false;
		let completed = false;
		try {
			const cached = await this.readStreamMeta(metaKey);
			if (
				cached &&
				!silent &&
				delivered.pos === 0 &&
				!this.isStreamExpired(cached)
			) {
				// another generator won the race and this consumer has nothing
				// delivered yet: let the caller serve the cached stream
				return false;
			}

			const chunkSize = Math.max(
				1,
				options.chunkSize ?? DEFAULT_STREAM_CHUNK_SIZE,
			);
			const compression = options.compression ?? !this.settings.noCompress;
			const serializer = compression ? gzipValueSerializer : valueSerializer;
			const ttl = this.streamTtl(options);
			const maxLifetime = options.maxLifetime ?? DEFAULT_STREAM_MAX_LIFETIME;
			const streaming = !silent && delivered.pos === 0;

			let chunkIndex = 0;
			let buffer: T[] = [];
			for await (const item of callback()) {
				if (streaming) {
					delivered.pos++;
					yield item;
				}
				buffer.push(item);
				if (buffer.length >= chunkSize) {
					await this.saveStreamChunk(
						genKey,
						chunkIndex++,
						buffer,
						serializer,
						maxLifetime,
					);
					buffer = [];
				}
			}
			if (buffer.length) {
				await this.saveStreamChunk(
					genKey,
					chunkIndex++,
					buffer,
					serializer,
					maxLifetime,
				);
			}
			created = true;

			if (await this.wasStreamCleared(metaKey, startedAt)) {
				// the stream was cleared while this generation was being
				// produced: publishing would resurrect cleared data, so drop
				// the chunks (the finally block deletes them) and let the
				// consumer regenerate from a post-clear position
				return streaming;
			}
			// publish: pointer + metadata in a single atomic HSET, then the
			// horizon sweeper ttl. A crash before the HSET leaves an
			// unpointed generation that expires; a crash between HSET and
			// EXPIRE leaves a pointed generation whose meta lacks a ttl,
			// re-set by the next reader's renew. The superseded generation
			// is kept in meta as prev, for opportunistic reclamation
			const previous = await this.try(metaKey, () =>
				this.redis.hget(metaKey, STREAM_POINTER_FIELD),
			);
			await this.try(metaKey, () =>
				this.redis.hset(
					metaKey,
					STREAM_POINTER_FIELD,
					genKey,
					STREAM_META_FIELD,
					JSON.stringify({
						prev: previous && previous !== genKey ? previous : undefined,
						chunks: chunkIndex,
						chunkSize,
						compression,
						ttl,
						maxLifetime,
						createdAt: Date.now(),
					} satisfies StreamMetaFields),
				),
			);
			await this.try(metaKey, () => this.redis.expire(metaKey, maxLifetime));
			completed = true;
			return streaming;
		} finally {
			if (created && !completed) {
				await this.try(genKey, () => this.redis.del(genKey));
			}
			if (release) {
				this.dontWait(async () => release());
			}
		}
	}

	/**
	 * A clearCache() during generation means the consumer explicitly wanted
	 * this data gone; a refresh that started before it must not publish an
	 * older snapshot afterwards. A tombstone only ever names a generation
	 * that was published before the clear (so already superseded), and an
	 * unparseable tombstone counts as cleared: refusing to publish is the
	 * safe side of the trade, the stream is simply regenerated later.
	 */
	private async wasStreamCleared(metaKey: string, genCreatedAt: number) {
		const tombstone = await this.try(metaKey, () =>
			this.redis.hget(
				`${metaKey}${STREAM_CLEARED_SUFFIX}`,
				STREAM_CLEARED_FIELD,
			),
		);
		if (!tombstone) {
			return false;
		}
		const clearedAt = Number(tombstone);
		return !Number.isFinite(clearedAt) || clearedAt >= genCreatedAt;
	}

	/**
	 * Silent production used by the background refresh: same as
	 * generateStream but without a consumer attached.
	 */
	private async produceStream<T>(
		key: string,
		metaKey: string,
		callback: () => AsyncIterable<T>,
		options: StreamOptions,
		delivered: Delivered,
		silent: boolean,
	) {
		const generator = this.generateStream<T>(
			key,
			metaKey,
			callback,
			options,
			delivered,
			silent,
		);
		// drain without yielding: the result value is not needed, only the
		// publication side effect
		for await (const _item of generator) {
			void _item;
		}
	}

	private async readStreamMeta(
		metaKey: string,
	): Promise<StreamMeta | undefined> {
		const [pointer, raw] =
			(await this.try(metaKey, () =>
				this.redis.hmget(metaKey, STREAM_POINTER_FIELD, STREAM_META_FIELD),
			)) ?? [];
		if (!pointer || !raw) {
			return undefined;
		}
		try {
			const parsed = JSON.parse(raw);
			if (typeof parsed?.chunks !== 'number') {
				return undefined;
			}
			return {
				genKey: pointer,
				prev: typeof parsed.prev === 'string' ? parsed.prev : undefined,
				chunks: parsed.chunks as number,
				chunkSize:
					typeof parsed.chunkSize === 'number'
						? parsed.chunkSize
						: DEFAULT_STREAM_CHUNK_SIZE,
				compression: !!parsed.compression,
				ttl: typeof parsed.ttl === 'number' ? parsed.ttl : undefined,
				createdAt: typeof parsed.createdAt === 'number' ? parsed.createdAt : 0,
				maxLifetime:
					typeof parsed.maxLifetime === 'number'
						? parsed.maxLifetime
						: DEFAULT_STREAM_MAX_LIFETIME,
			};
		} catch {
			return undefined;
		}
	}

	/**
	 * Reads generation chunks starting at delivered.pos, renewing the
	 * generation horizon ttl before each fetch, and updates delivered before
	 * yielding, so a loss is always recoverable from the last delivered
	 * position.
	 */
	private async *readStreamChunks<T>(
		meta: StreamMeta,
		delivered: Delivered,
	): AsyncGenerator<T> {
		const serializer = meta.compression ? gzipValueSerializer : valueSerializer;
		// chunks before this one are full by construction: the resume chunk
		// can be computed without reading them
		const startChunk = Math.floor(delivered.pos / meta.chunkSize);
		for (let i = startChunk; i < meta.chunks; i++) {
			await this.renewStream(meta.genKey, meta.maxLifetime);
			const chunk = await this.redis.hgetBuffer(meta.genKey, `${i}`);
			if (!chunk) {
				throw new StreamLostError(meta.genKey);
			}
			const items = (await serializer.deserialize(chunk)) as T[];
			const from = Math.max(0, delivered.pos - i * meta.chunkSize);
			for (let j = from; j < items.length; j++) {
				delivered.pos++;
				yield items[j];
			}
		}
	}

	/**
	 * Opportunistic reclamation of a superseded generation: a read that
	 * starts with two generations in play (meta.prev) is an opportunity to
	 * clear the old one in case nobody is using it. The generation ttl is
	 * renewed by every touch (generator and reader alike), so a generation
	 * idle for longer than the retire grace has no consumer left on it.
	 * Check-then-delete races are accepted by design: the window is
	 * milliseconds, and its only possible victim is a reader still chunking
	 * prev, which lands on the transparent resume path. A missed
	 * reclamation is harmless: the ttl sweeper gets it anyway.
	 */
	private tryReclaimSuperseded(meta: StreamMeta, options: StreamOptions) {
		const prev = meta.prev;
		if (!prev || prev === meta.genKey) {
			return;
		}
		const grace =
			(options.retireGrace ?? DEFAULT_STREAM_RETIRE_GRACE) * MS_PER_SECOND;
		this.dontWait(async () => {
			const pttl = await this.try(prev, () => this.redis.pttl(prev));
			if (pttl === undefined) {
				return;
			}
			// already gone: nothing to do; without a sweeper ttl it is an
			// orphan by definition. Otherwise, the generation is idle when
			// its remaining ttl fell grace behind the full horizon it is
			// renewed to on every touch
			if (pttl === PTTL_ABSENT) {
				return;
			}
			const idle =
				pttl === PTTL_UNLIMITED ||
				meta.maxLifetime * MS_PER_SECOND - pttl >= grace;
			if (idle) {
				await this.try(prev, () => this.redis.del(prev));
			}
		});
	}

	private async renewStream(genKey: string, maxLifetime: number) {
		await this.try(genKey, () => this.redis.expire(genKey, maxLifetime));
	}

	private async saveStreamChunk(
		genKey: string,
		chunkIndex: number,
		chunk: unknown[],
		serializer: typeof valueSerializer,
		maxLifetime: number,
	) {
		const value = (await serializer.serialize(chunk)) as string | Buffer;
		await this.try(genKey, () =>
			this.redis.hset(genKey, `${chunkIndex}`, value),
		);
		// the horizon ttl rides on every write: a crashed generation is
		// swept, and a live one is kept within its serving horizon
		await this.renewStream(genKey, maxLifetime);
	}

	private streamTtl(options: StreamOptions) {
		let ttl = options.ttl;
		if (!ttl && this.redisTtl) {
			try {
				ttl = this.redisTtl(undefined as never);
			} catch {
				ttl = undefined;
			}
		}
		return ttl || 1;
	}

	private async getResult<T>(
		key: string,
		callback: () => PromiseLike<T>,
		noCacheIf?: (t: T) => boolean,
		ttl?: number,
	) {
		const release = await this.acquire(key);
		let saveCache = resolved;
		try {
			const result = await this.tryCache(key, callback);
			if (result !== undefined && !noCacheIf?.(result)) {
				saveCache = this.updateCache<T>(key, result, ttl);
			}
			return result;
		} finally {
			if (release) {
				this.dontWait(() => saveCache.then(() => release()));
			}
		}
	}

	private async acquire(key: string): Promise<undefined | (() => void)> {
		let release: undefined | (() => Promise<unknown>);
		const { semaphore } = this.settings;
		if (semaphore) {
			release = await this.tryTo(() => semaphore.acquire(key));
		} else {
			const { redis } = this;
			const mutex = new Mutex(
				redis as Redis,
				`${this.redisPrefix}REMEMBERED-SEMAPHORE:${key}`,
				{
					...this.semaphoreConfig,
					onLockLost: (err) => this.settings.onLockLost?.(key, err),
				},
			);
			const acquire = mutex.acquire.bind(mutex);
			release = mutex.release.bind(mutex);

			await this.tryTo(acquire);
		}
		return await this.prepareRelease(release);
	}

	private prepareRelease(
		release: (() => Promise<unknown>) | undefined,
	): (() => void) | PromiseLike<() => void> | undefined {
		return release ? () => this.dontWait(release) : undefined;
	}

	async updateCache<T>(
		cacheKey: string,
		result: T,
		ttl = this.redisTtl?.(result),
	): Promise<void> {
		try {
			const redisKey = this.getRedisKey(cacheKey);
			const realTtl = ttl || 1;
			const resultCopy: T = clone(result);
			if (
				this.alternativePersistence &&
				(!this.alternativePersistence.shouldUseAlternativePersistence ||
					this.alternativePersistence.shouldUseAlternativePersistence(
						resultCopy,
						realTtl,
					))
			) {
				if (!this.alternativePersistence.maxSavingDelay) {
					await this.persistKeys(
						{
							fulfilled: false,
							entries: new Map([[redisKey, [realTtl, resultCopy]]]),
						},
						redisKey.replace(/:/g, '/'),
					);
				} else if (!this.waitSaving) {
					const savingObjects: SavingObjects = {
						fulfilled: false,
						entries: new Map(),
					};
					savingObjects.entries.set(redisKey, [realTtl, resultCopy]);
					const { maxResultsPerSave } = this.alternativePersistence;
					const savingPromise = (this.savingPromise =
						this.prepareAccumulatingPromise(
							maxResultsPerSave,
							savingObjects,
						).then(() => {
							if (this.savingPromise === savingPromise) {
								this.savingPromise = undefined;
							}
						}));
				} else {
					const savingObjects = this.savingObjects!;
					savingObjects.entries.set(redisKey, [realTtl, resultCopy]);
					const { maxResultsPerSave } = this.alternativePersistence;
					if (
						maxResultsPerSave &&
						savingObjects.entries.size >= maxResultsPerSave
					) {
						this.waitSaving = false;
						this.savingObjects = undefined;
					}
				}
				await this.savingPromise;
			} else {
				await this.persist(resultCopy, (value) =>
					this.try(redisKey, () => this.redis.setex(redisKey, realTtl, value)),
				);
			}
		} catch (err) {
			if (!this.onError) {
				throw err;
			}
			this.onError(cacheKey, err as Error);
		}
	}

	private async prepareAccumulatingPromise(
		maxResultsPerSave: number | undefined,
		savingObjects: SavingObjects,
	) {
		if (!maxResultsPerSave || savingObjects.entries.size < maxResultsPerSave) {
			this.savingObjects = savingObjects;
			this.waitSaving = true;
			await delay(this.alternativePersistence!.maxSavingDelay);
			this.waitSaving = false;
			this.savingObjects = undefined;
		}
		await this.persistKeys(savingObjects, undefined);
	}

	private async persistKeys(
		savingObjects: SavingObjects,
		fixedId: string | undefined,
	) {
		if (!savingObjects.fulfilled) {
			savingObjects.fulfilled = true;
			const promises = this.generateSavingPromises(savingObjects, fixedId);
			await Promise.all(promises);
		}
	}

	private *generateSavingPromises(
		savingObjects: SavingObjects,
		fixedId: string | undefined,
	) {
		const ttlSavingObjects = new Map<
			number,
			[string, Record<string, unknown>, Map<string, number>]
		>();

		for (const [key, [ttl, value]] of savingObjects.entries.entries()) {
			let ttlSaving = ttlSavingObjects.get(ttl);
			if (!ttlSaving) {
				ttlSaving = [fixedId ?? v4(), {}, new Map()];
				ttlSavingObjects.set(ttl, ttlSaving);
			}
			ttlSaving[1][key] = value;
			ttlSaving[TTL_MAP_POS].set(key, ttl);
		}
		for (const [ttl, [key, entries, ttls]] of ttlSavingObjects) {
			yield this.persist(entries, (value) =>
				this.alternativePersistence!.save(key, value, ttl),
			);
			yield* this.saveKeys(ttls, key);
		}
	}

	private async try<T>(key: string, cb: () => Promise<T>) {
		try {
			return await cb();
		} catch (err) {
			this.onError?.(key, err as Error);
			return undefined;
		}
	}

	private *saveKeys(entries: Map<string, number>, key: string) {
		for (const [redisKey, ttl] of entries.entries()) {
			yield this.try(redisKey, () => this.redis.setex(redisKey, ttl || 1, key));
		}
	}

	private get serializer() {
		return this.settings.noCompress ? valueSerializer : gzipValueSerializer;
	}

	private async persist<T>(
		savingObjects: T,
		saving: (payload: string | Buffer) => Promise<unknown>,
	): Promise<unknown> {
		const value = (await this.serializer.serialize(savingObjects)) as
			string | Buffer;
		return await saving(value);
	}

	async clearCache(key: string) {
		const metaKey = this.getRedisKey(`${key}${STREAM_META_SUFFIX}`);
		const pointer = await this.try(metaKey, () =>
			this.redis.hget(metaKey, STREAM_POINTER_FIELD),
		);
		const cleared = await this.try(key, () =>
			this.redis.del(
				this.getRedisKey(key),
				metaKey,
				...(pointer ? [pointer] : []),
			),
		);
		// a refresh or generation that started before this clear may still be
		// publishing: remember the moment of the clear so those publishes are
		// rejected instead of resurrecting the cleared stream
		await this.try(key, () =>
			this.redis.hset(
				`${metaKey}${STREAM_CLEARED_SUFFIX}`,
				STREAM_CLEARED_FIELD,
				`${Date.now()}`,
			),
		);
		await this.try(key, () =>
			this.redis.expire(
				`${metaKey}${STREAM_CLEARED_SUFFIX}`,
				STREAM_CLEAR_TOMBSTONE_TTL,
			),
		);
		return cleared;
	}

	private async tryCache<T>(key: string, callback: () => PromiseLike<T>) {
		const result = await this.getFromCacheInternal<T>(key, true);
		if (result !== EMPTY) {
			this.onCache?.(key);
			return result;
		}
		return await callback();
	}

	private async getFromCacheInternal<T>(
		key: string,
		firstCheck: boolean,
	): Promise<T | typeof EMPTY> {
		const redisKey = this.getRedisKey(key);
		const cached = await this.try(redisKey, () =>
			this.redis.getBuffer(redisKey),
		);
		if (cached) {
			if (
				this.alternativePersistence &&
				cached.length <= MAX_ALTERNATIVE_KEY_SIZE
			) {
				const alternativeCached = await this.alternativePersistence.get(
					cached.toString(),
					firstCheck,
				);
				if (alternativeCached) {
					const deserialized =
						await this.serializer.deserialize(alternativeCached);
					return deserialized.hasOwnProperty(redisKey)
						? deserialized[redisKey]
						: EMPTY;
				}
			}
			try {
				return await this.serializer.deserialize(cached);
			} catch {
				return EMPTY;
			}
		}
		return EMPTY;
	}

	private getRedisKey(key: string) {
		return `${this.redisPrefix}${key}`;
	}
}
