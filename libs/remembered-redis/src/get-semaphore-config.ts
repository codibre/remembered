import { LockOptions } from 'redis-semaphore';
import { RememberedRedisConfig } from './remembered-redis-config';
import {
	DEFAULT_LOCK_TIMEOUT,
	DEFAULT_ACQUIRE_TIMEOUT,
	DEFAULT_RETRY_INTERVAL,
	DEFAULT_REFRESH_INTERVAL,
} from './remembered-redis';
import { Redis } from 'ioredis';

export function getSemaphoreConfig(config: RememberedRedisConfig): LockOptions {
	return {
		lockTimeout: config.lockTimeout || DEFAULT_LOCK_TIMEOUT,
		acquireTimeout: config.acquireTimeout || DEFAULT_ACQUIRE_TIMEOUT,
		retryInterval: config.retryInterval || DEFAULT_RETRY_INTERVAL,
		refreshInterval: config.refreshInterval || DEFAULT_REFRESH_INTERVAL,
	};
}

export interface RememberedSemaphore {
	acquire(): Promise<void>;
	release(): void;
}

export type RequiredField<Type, Field extends keyof Type> = Omit<Type, Field> &
	Required<Pick<Type, Field>>;
/**
 * What a RememberedRedis client must provide: the commands the cache
 * itself calls, plus eval/evalsha, which redis-semaphore needs to run its
 * lock scripts through the very same client (when no custom semaphore is
 * configured) — a client without them would compile and then fail at the
 * first acquire.
 */
export type RedisLike = Pick<
	Redis,
	| 'getBuffer'
	| 'setex'
	| 'del'
	| 'eval'
	| 'evalsha'
	| 'hget'
	| 'hexists'
	| 'hgetBuffer'
	| 'hset'
	| 'hmget'
	| 'expire'
	| 'pttl'
>;
