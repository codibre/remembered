import { LockOptions } from 'redis-semaphore';

export interface SemaphoreErrorCallback {
	(key: string, err: Error): void;
}

export interface RememberedRedisSemaphoreSettings {
	lockOptions?: LockOptions;
	prefix?: string;
	fixedPrefix?: boolean;
	onLockLost?: SemaphoreErrorCallback;
	onAcquireError?: SemaphoreErrorCallback;
}
