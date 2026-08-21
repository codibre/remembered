const MutexMock = jest.fn();
jest.mock('redis-semaphore', () => ({ Mutex: MutexMock }));
import { Redis } from 'ioredis';
import { LockOptions, Mutex } from 'redis-semaphore';
import {
	RememberedRedisSemaphore,
	RememberedRedisSemaphoreSettings,
} from '../../src';
import { promisify } from 'util';
import { defaultLockOptions } from 'src/get-semaphore-config';
import { Lock } from 'redis-semaphore/lib/Lock';

const proto = RememberedRedisSemaphore.prototype;
const delay = promisify(setTimeout);

describe(RememberedRedisSemaphore.name, () => {
	let target: RememberedRedisSemaphore;
	let redis: Redis;
	let mutex: Mutex;
	let settings: RememberedRedisSemaphoreSettings;

	beforeEach(() => {
		redis = {} as Redis;
		settings = {} as RememberedRedisSemaphoreSettings;
		mutex = {} as Mutex;
		MutexMock.mockReturnValue(mutex);
		target = new RememberedRedisSemaphore(redis, settings);
	});

	describe(proto.acquire.name, () => {
		let acquire: jest.SpyInstance;
		let releaseMock: jest.SpyInstance;

		beforeEach(() => {
			acquire = mutex.acquire = jest.fn().mockResolvedValue(undefined);
			releaseMock = mutex.release = jest.fn().mockResolvedValue(undefined);
			settings.lockOptions = { info: 'my lock options ' } as any;
		});

		it('should implement mutex using redis-semaphore when no prefix is defined', async () => {
			const release = await target.acquire('my key');

			expect(Mutex).toHaveCallsLike([
				redis,
				'my key',
				{ ...defaultLockOptions, onLockLost: expect.any(Function) },
			]);
			expect(mutex.acquire).toHaveCallsLike([]);
			expect(mutex.release).toHaveCallsLike();

			await release();
			expect(mutex.release).toHaveCallsLike();
			await delay(1);
			expect(mutex.release).toHaveCallsLike([]);
		});

		it('should implement mutex using redis-semaphore when just custom prefix is defined', async () => {
			target['settings'].prefix = 'my prefix';

			const release = await target.acquire('my key');

			expect(Mutex).toHaveCallsLike([
				redis,
				'my prefix:my key',
				{ ...defaultLockOptions, onLockLost: expect.any(Function) },
			]);
			expect(mutex.acquire).toHaveCallsLike([]);
			expect(mutex.release).toHaveCallsLike();

			await release();
			expect(mutex.release).toHaveCallsLike();
			await delay(1);
			expect(mutex.release).toHaveCallsLike([]);
		});

		it('should implement mutex using redis-semaphore when just fixed prefix is defined', async () => {
			target['settings'].fixedPrefix = true;

			const release = await target.acquire('my key');

			expect(Mutex).toHaveCallsLike([
				redis,
				'REMEMBERED-SEMAPHORE:my key',
				{ ...defaultLockOptions, onLockLost: expect.any(Function) },
			]);
			expect(mutex.acquire).toHaveCallsLike([]);
			expect(mutex.release).toHaveCallsLike();

			await release();
			expect(mutex.release).toHaveCallsLike();
			await delay(1);
			expect(mutex.release).toHaveCallsLike([]);
		});

		it('should implement mutex using redis-semaphore when just both prefixes are defined', async () => {
			target['settings'].fixedPrefix = true;
			target['settings'].prefix = 'my prefix';

			const release = await target.acquire('my key');

			expect(Mutex).toHaveCallsLike([
				redis,
				'my prefix:REMEMBERED-SEMAPHORE:my key',
				{ ...defaultLockOptions, onLockLost: expect.any(Function) },
			]);
			expect(mutex.acquire).toHaveCallsLike([]);
			expect(mutex.release).toHaveCallsLike();

			await release();
			expect(mutex.release).toHaveCallsLike();
			await delay(1);
			expect(mutex.release).toHaveCallsLike([]);
		});

		it('should create Mutex setting on lock lost callback, when no onLockLost is set', async () => {
			const error = new Error('my error');
			let options: LockOptions;
			MutexMock.mockImplementation((_, b) => {
				options = b;
				return mutex;
			});
			acquire.mockImplementation(() => {
				options.onLockLost!.call({} as Lock, error);
			});

			await target.acquire('my key');

			expect(acquire).toHaveCallsLike([]);
		});

		it('should create Mutex setting on lock lost callback, when onLockLost is set', async () => {
			const error = new Error('my error');
			let options: LockOptions;
			MutexMock.mockImplementation((_, _2, c) => {
				options = c;
				return mutex;
			});
			acquire.mockImplementation(() => {
				options.onLockLost!.call({} as Lock, error);
			});
			const onLockLost = (target['settings'].onLockLost = jest.fn());

			await target.acquire('my key');

			expect(onLockLost).toHaveCallsLike(['my key', error]);
		});

		it('should not throw an error when semaphore acquiring fails', async () => {
			const error = new Error('my error');
			acquire.mockRejectedValue(error);

			await target.acquire('my key');

			expect(acquire).toHaveCallsLike([]);
		});

		it('should throw an error when semaphore acquiring fails and ignoreAcquiringError is false', async () => {
			const error = new Error('my error');
			acquire.mockRejectedValue(error);
			let thrownError: any;

			try {
				await target.acquire('my key', false);
			} catch (err) {
				thrownError = err;
			}

			expect(acquire).toHaveCallsLike([]);
			expect(thrownError).toBe(error);
		});

		it('should call onAcquireError when semaphore acquiring fails and onAcquireError is defined', async () => {
			const error = new Error('my error');
			acquire.mockRejectedValue(error);
			const onAcquireError = (target['settings'].onAcquireError = jest.fn());

			await target.acquire('my key');

			expect(acquire).toHaveCallsLike([]);
			expect(onAcquireError).toHaveCallsLike(['my key', error]);
		});

		it('should not throw an error when release fails', async () => {
			const error = new Error('my error');
			releaseMock.mockRejectedValue(error);

			const release = await target.acquire('my key');

			expect(acquire).toHaveCallsLike([]);

			await release();
			expect(releaseMock).toHaveCallsLike();
			await delay(1);
			expect(releaseMock).toHaveCallsLike([]);
		});
	});

	describe(proto.run.name, () => {
		let release: jest.SpyInstance;

		beforeEach(() => {
			release = jest.fn();
			jest.spyOn(target, 'acquire').mockResolvedValue(release as any);
		});

		it('should acquire semaphore, run callback and then release semaphore in the background', async () => {
			const callback = jest.fn().mockResolvedValue('expected result');

			const result = await target.run('my key', callback);

			expect(result).toBe('expected result');
			expect(target['acquire']).toHaveCallsLike(['my key', undefined]);
			expect(release).toHaveCallsLike();
			await delay(1);
			expect(release).toHaveCallsLike([]);
		});

		it('should acquire semaphore, run callback and then release semaphore in the background, even in case of error', async () => {
			const error = new Error('my error');
			const callback = jest.fn().mockRejectedValue(error);
			let thrownError: any;

			try {
				await target.run('my key', callback, 'ignore error value' as any);
			} catch (err) {
				thrownError = err;
			}

			expect(thrownError).toBe(error);
			expect(target['acquire']).toHaveCallsLike([
				'my key',
				'ignore error value',
			]);
			expect(release).toHaveCallsLike();
			await delay(1);
			expect(release).toHaveCallsLike([]);
		});
	});

	describe(proto.wrap.name, () => {
		let release: jest.SpyInstance;

		beforeEach(() => {
			release = jest.fn();
			jest.spyOn(target, 'acquire').mockResolvedValue(release as any);
		});

		it('should acquire semaphore, run callback and then release semaphore in the background', async () => {
			const callback = jest.fn().mockResolvedValue('expected result');

			const wrappedCallback = await target.wrap(callback, (...args: string[]) =>
				args.join(':'),
			);
			const result = await wrappedCallback('a', 'b', 'c', 'd');

			expect(result).toBe('expected result');
			expect(target['acquire']).toHaveCallsLike(['a:b:c:d', undefined]);
			expect(release).toHaveCallsLike();
			await delay(1);
			expect(release).toHaveCallsLike([]);
		});

		it('should acquire semaphore, run callback and then release semaphore in the background, even in case of error', async () => {
			const error = new Error('my error');
			const callback = jest.fn().mockRejectedValue(error);
			let thrownError: any;

			try {
				const wrappedCallback = await target.wrap(
					callback,
					(...args: string[]) => args.join(':'),
					'ignore error value' as any,
				);
				await wrappedCallback('a', 'b', 'c', 'd');
			} catch (err) {
				thrownError = err;
			}

			expect(thrownError).toBe(error);
			expect(target['acquire']).toHaveCallsLike([
				'a:b:c:d',
				'ignore error value',
			]);
			expect(release).toHaveCallsLike();
			await delay(1);
			expect(release).toHaveCallsLike([]);
		});
	});
});
