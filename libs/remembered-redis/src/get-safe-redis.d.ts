import { RedisLike } from './get-semaphore-config';
export declare function getSafeRedis(source: RedisLike, onError?: (key: string, err: Error) => unknown, timeout?: number): RedisLike;
