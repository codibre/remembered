import { RememberedConfig, Ttl } from 'remembered';

export type LogError = (message: string) => any;
export type Action<T> = () => PromiseLike<T>;
export type TryTo = <T>(action: Action<T>) => Promise<T | undefined>;
export interface AlternativePersistence {
	/**
	 * Saves the informed content
	 * @param key the key for the content
	 * @param content the content to be saved
	 * @param ttl the expiration time, in seconds, that Redis will use to maintain the reference for this key
	 */
	save(key: string, content: string | Buffer, ttl: number): Promise<void>;
	/**
	 * Get the content for the informed key
	 * @param key the key for the content
	 */
	get(key: string, firstCheck: boolean): Promise<Buffer | string | undefined>;
	/**
	 * If defined and returns true, the alternative persistence is applied; otherwise it is not.
	 * @param content the content to be saved
	 * @param ttl the expiration time, in seconds, that Redis will use to maintain the reference for this key
	 */
	shouldUseAlternativePersistence?: (content: unknown, ttl: number) => boolean;
	maxSavingDelay?: number;
	maxResultsPerSave?: number;
}

export interface StreamOptions {
	/**
	 * Number of items stored per Redis hash field. Defaults to 500
	 */
	chunkSize?: number;
	/**
	 * Time to live, in seconds, for the whole stream. Defaults to the instance redisTtl
	 */
	ttl?: number;
	/**
	 * Whether each chunk should be compressed before being saved. Defaults to the instance compression setting
	 */
	compression?: boolean;
	/**
	 * Maximum lifetime, in seconds, since the stream generation started, for
	 * which active readers and generators may keep renewing the stream ttl.
	 * Prevents a stuck consumer from keeping an old stream alive forever.
	 * Defaults to 24h
	 */
	maxLifetime?: number;
	/**
	 * Seconds a superseded (stale, replaced) generation must stay untouched
	 * before readers reclaim it opportunistically, instead of waiting for the
	 * ttl sweeper. Active readers keep renewing the generation, so a fresh
	 * ttl means someone is still consuming it. Defaults to 10 minutes
	 */
	retireGrace?: number;
}

export interface Semaphore {
	acquire(key: string): Promise<() => Promise<unknown>>;
	/**
	 * Optional try-once acquisition, used by the getSWRStream revalidation
	 * soft mutex: resolves to a release callback when the lock was taken,
	 * or to undefined when somebody already holds it — in which case the
	 * refresh is simply forgotten (never queued), and a later stale read
	 * tries again. When not implemented, an internal redis-semaphore Mutex
	 * is used as the default behavior.
	 */
	tryAcquire?(key: string): Promise<(() => Promise<unknown>) | undefined>;
}

export interface RememberedRedisConfig extends RememberedConfig {
	redisTtl?: Ttl;
	redisPrefix?: string;
	lockTimeout?: number;
	acquireTimeout?: number;
	retryInterval?: number;
	refreshInterval?: number;
	noCompress?: boolean;
	redisTimeout?: number;
	logError?: LogError;
	onCache?: (key: string) => void;
	onError?: (key: string, err: Error) => any;
	onLockLost?: (key: string, err: Error & { name: string }) => any;
	/**
	 * When informed, redis is used only for ttl control, but the real data is persisted using these methods
	 */
	alternativePersistence?: AlternativePersistence;
	semaphore?: Semaphore;
}
