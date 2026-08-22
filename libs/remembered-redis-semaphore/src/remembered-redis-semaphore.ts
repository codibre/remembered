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
	 * Acquires the requested key and returns the release function
	 * @param key The key to be acquired
	 * @param ignoreAcquiringError true if acquiring errors can be ignored. Default true.
	 * @returns The release function
	 */
	async acquire(
		key: string,
		ignoreAcquiringError = true,
	): Promise<() => Promise<unknown>> {
		const { redis } = this;
		const { prefix } = this.settings;
		const mutex = new Mutex(
			redis,
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
