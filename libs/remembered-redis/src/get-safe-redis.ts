import { RedisLike } from './get-semaphore-config';
import { getSafeInstance } from 'get-safe-instance';

const usedRedisMethods = [
	'getBuffer',
	'setex',
	'del',
	'eval',
	'evalsha',
	'hget',
	'hexists',
	'hgetBuffer',
	'hset',
	'hmget',
	'expire',
	'pttl',
] as const;

export function getSafeRedis(
	source: RedisLike,
	onError?: (key: string, err: Error) => unknown,
	timeout?: number,
): RedisLike {
	return timeout
		? getSafeInstance(
				source,
				timeout,
				usedRedisMethods.filter(
					(method): method is keyof RedisLike => method in source,
				),
				(key, _, err) => onError?.(key, err),
			)
		: source;
}
