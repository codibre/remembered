import { LockOptions } from 'redis-semaphore';
import { RememberedRedisConfig } from './remembered-redis-config';
import { Redis } from 'ioredis';
export declare function getSemaphoreConfig(
	config: RememberedRedisConfig,
): LockOptions;
export interface RememberedSemaphore {
	acquire(): Promise<void>;
	release(): void;
}
export type RequiredField<Type, Field extends keyof Type> = Omit<Type, Field> &
	Required<Pick<Type, Field>>;
export type RedisLike = Pick<Redis, 'getBuffer' | 'setex' | 'del'>;
export type RedisMutexReadyLike = Pick<
	Redis,
	'getBuffer' | 'setex' | 'del' | 'eval' | 'evalsha'
>;
