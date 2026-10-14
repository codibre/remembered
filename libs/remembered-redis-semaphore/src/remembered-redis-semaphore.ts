import { defaultLockOptions } from './get-semaphore-config';
import { Semaphore } from '@remembered/redis';
import { Mutex } from 'redis-semaphore';
import { Redis } from 'ioredis';
import { dontWait } from 'remembered';
import { StringBuffer } from './string-buffer';
import { RememberedRedisSemaphoreSettings } from './remembered-redis-semaphore-settings';

type RequiredExcept<T, keys extends keyof T> = Required<Omit<T, keys>> & T;

export class RememberedRedisSemaphore implements Semaphore {
	private settings: RequiredExcept<
		RememberedRedisSemaphoreSettings,
		'prefix' | 'fixedPrefix' | 'onLockLost' | 'onAcquireError'
	>;
	constructor(
		private redis: Redis,
		settings: RememberedRedisSemaphoreSettings,
	) {
		this.settings = { lockOptions: defaultLockOptions, ...settings };
	}

	/**
	 * Builds the mutex for a key, so acquire and tryAcquire share the exact
	 * same lock namespace and are mutually exclusive
	 */
	private buildMutex(key: string): Mutex {
		const { prefix } = this.settings;
		return new Mutex(
			this.redis,
			new StringBuffer()
				.$If(prefix, [prefix, ':'])
				.$If(this.settings.fixedPrefix, ['REMEMBERED-SEMAPHORE:'])
				.$(key)
				.toString(),
			{
				...this.settings.lockOptions,
				onLockLost: (err) => this.settings.onLockLost?.(key, err),
			},
		);
	}

	/**
	 * Acquires the requested key and returns the release function
	 * @param key The key to be acquired
	 * @param ignoreAcquiringError true if acquiring errors can be ignored. Default true.
	 * @returns The release function
	 */
	async acquire(
		key: string,
		ignoreAcquiringError = true,
	): Promise<() => Promise<unknown>> {
		const mutex = this.buildMutex(key);
		const acquire = mutex.acquire.bind(mutex);
		const release = mutex.release.bind(mutex);

		try {
			await acquire();
		} catch (err) {
			if (!ignoreAcquiringError) {
				throw err;
			}
			this.settings.onAcquireError?.(key, err as Error);
		}

		return async () => dontWait(release);
	}

	/**
	 * Tries to acquire the requested key once, without queueing: returns
	 * the release function when the lock was taken; undefined when someone
	 * already holds it, or when the lock could not be checked (the error
	 * is reported through onAcquireError) — in both cases the caller is
	 * expected to forget the work, not to retry it
	 * @param key The key to be acquired
	 * @returns The release function, if the lock was taken
	 */
	async tryAcquire(key: string): Promise<(() => Promise<unknown>) | undefined> {
		const mutex = this.buildMutex(key);
		try {
			if (!(await mutex.tryAcquire())) {
				return undefined;
			}
		} catch (err) {
			this.settings.onAcquireError?.(key, err as Error);
			return undefined;
		}
		const release = mutex.release.bind(mutex);
		return async () => dontWait(release);
	}

	/**
	 * Runs the callback using semaphore
	 * @param key the key to the semaphore
	 * @param callback the callback to be executed
	 * @param ignoreAcquiringError true if acquiring errors can be ignored. Default true
	 * @returns the callback result
	 */
	async run<T>(
		key: string,
		callback: () => Promise<T>,
		ignoreAcquiringError?: boolean,
	) {
		let release: (() => Promise<unknown>) | undefined;
		try {
			release = await this.acquire(key, ignoreAcquiringError);
			return await callback();
		} finally {
			if (release) {
				dontWait(release);
			}
		}
	}

	/**
	 * Returns a version of the informed callback that runs with a semaphore
	 * @param callback the callback to be executed
	 * @param getKey a function that returns the key for the semaphore
	 * @param ignoreAcquiringError true if acquiring errors can be ignored. Default true
	 * @returns the callback result
	 */

	async wrap<Args extends any[], T>(
		callback: (...args: Args) => Promise<T>,
		getKey: (...args: Args) => string,
		ignoreAcquiringError?: boolean,
	) {
		return (...args: Args) =>
			this.run(getKey(...args), () => callback(...args), ignoreAcquiringError);
	}
}
