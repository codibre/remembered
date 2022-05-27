import { Remembered } from '../../src';
import { delay } from '../../src/delay';
import { expectCallsLike, getNames } from './setup';

const methods = getNames(Remembered);

describe(Remembered.name, () => {
	let target: Remembered;

	beforeEach(() => {
		target = new Remembered({
			ttl: 100,
		});
	});

	describe(methods.get, () => {
		it('should remember the last result until the ttl has passed', async () => {
			let count = 0;
			const getter = jest.fn().mockImplementation(async () => ++count);
			const key = 'key value';

			const result1 = await target.get(key, getter);
			await delay(60);
			const result2 = await target.get(key, getter);
			await delay(60);
			const result3 = await target.get(key, getter);
			await delay(60);
			const result4 = await target.get(key, getter);

			expectCallsLike(getter, [], []);
			expect(result1).toBe(1);
			expect(result2).toBe(1);
			expect(result3).toBe(2);
			expect(result4).toBe(2);
		});
		it('should remember the last result until the ttl has passed when noCacheIf is informed and returns false', async () => {
			let count = 0;
			const getter = jest.fn().mockImplementation(async () => ++count);
			const key = 'key value';

			const result1 = await target.get(key, getter, () => false);
			await delay(60);
			const result2 = await target.get(key, getter, () => false);
			await delay(60);
			const result3 = await target.get(key, getter, () => false);
			await delay(60);
			const result4 = await target.get(key, getter, () => false);

			expectCallsLike(getter, [], []);
			expect(result1).toBe(1);
			expect(result2).toBe(1);
			expect(result3).toBe(2);
			expect(result4).toBe(2);
		});

		it('should work with multiple keys independently', async () => {
			let count1 = 0;
			let count2 = 10;
			const getter1 = jest.fn().mockImplementation(async () => ++count1);
			const getter2 = jest.fn().mockImplementation(async () => ++count2);
			const key1 = 'key1';
			const key2 = 'key2';

			const result11 = await target.get(key1, getter1);
			const result21 = await target.get(key2, getter2);
			await delay(60);
			const result12 = await target.get(key1, getter1);
			const result22 = await target.get(key2, getter2);
			await delay(60);
			const result13 = await target.get(key1, getter1);
			const result23 = await target.get(key2, getter2);
			await delay(60);
			const result14 = await target.get(key1, getter1);
			const result24 = await target.get(key2, getter2);

			expectCallsLike(getter1, [], []);
			expect(result11).toBe(1);
			expect(result12).toBe(1);
			expect(result13).toBe(2);
			expect(result14).toBe(2);
			expect(result21).toBe(11);
			expect(result22).toBe(11);
			expect(result23).toBe(12);
			expect(result24).toBe(12);
		});

		it('should not keep a result that threw an exception', async () => {
			let count = 0;
			const getter = jest.fn().mockImplementation(async () => {
				if (++count === 1) {
					throw new Error('test');
				}
				return count;
			});
			const key = 'key value';
			let thrownError;

			try {
				await target.get(key, getter);
			} catch (err) {
				thrownError = err;
			}
			const result2 = await target.get(key, getter);

			expectCallsLike(getter, [], []);
			expect(thrownError).toBeInstanceOf(Error);
			expect(result2).toBe(2);
		});

		it('should remember promise only while it is not resolved when ttl is 0', async () => {
			let count = 0;
			const target0 = new Remembered();
			const getter = jest.fn().mockImplementation(async () => ++count);
			const key = 'key value';

			const [result1, result2] = await Promise.all([
				target0.get(key, getter),
				target0.get(key, getter),
			]);
			const result3 = await target0.get(key, getter);

			expect(result1).toBe(1);
			expect(result2).toBe(1);
			expect(result3).toBe(2);
		});

		it('should remember promise only while it is not resolved when noCacheIf is informed and returns true', async () => {
			let count = 0;
			const getter = jest.fn().mockImplementation(async () => ++count);
			const key = 'key value';

			const [result1, result2] = await Promise.all([
				target.get(key, getter, () => true),
				target.get(key, getter, () => true),
			]);
			const result3 = await target.get(key, getter, () => true);

			expect(result1).toBe(1);
			expect(result2).toBe(1);
			expect(result3).toBe(2);
		});
	});

	describe(methods.wrap, () => {
		it('should return a rememberable callback', async () => {
			let count = 0;
			const getter = jest.fn().mockImplementation(async () => ++count) as (
				k: string,
				n?: number,
			) => Promise<number>;

			const callback = target.wrap(getter, (k) => k);
			const result1 = await callback('test');
			await delay(60);
			const result2 = await callback('test', 1);
			await delay(60);
			const result3 = await callback('test', 2);
			await delay(60);
			const result4 = await callback('test', 3);

			expectCallsLike(getter, ['test'], ['test', 2]);
			expect(result1).toBe(1);
			expect(result2).toBe(1);
			expect(result3).toBe(2);
			expect(result4).toBe(2);
		});

		it('should return a rememberable callback that respects noCacheIf', async () => {
			let count = 0;
			const getter = jest.fn().mockImplementation(async () => ++count) as (
				k: string,
				n?: number,
			) => Promise<number>;

			const callback = target.wrap(
				getter,
				(k) => k,
				() => true,
			);
			const result1 = await callback('test');
			await delay(60);
			const result2 = await callback('test', 1);
			await delay(60);
			const result3 = await callback('test', 2);
			await delay(60);
			const result4 = await callback('test', 3);

			expectCallsLike(getter, ['test'], ['test', 1], ['test', 2], ['test', 3]);
			expect(result1).toBe(1);
			expect(result2).toBe(2);
			expect(result3).toBe(3);
			expect(result4).toBe(4);
		});

		it('should remember promise only while elapsed time is lesser than ttl when ttl is a function', async () => {
			let count = 0;
			let ttl = 100;
			const getter = jest.fn().mockImplementation(async () => ++count);
			target = new Remembered({ ttl: () => ttl });
			const key = 'key value';

			const result1 = await target.get(key, getter);
			await delay(60);
			ttl = 40;
			const result2 = await target.get(key, getter);
			await delay(60);
			ttl = 20;
			const result3 = await target.get(key, getter);
			await delay(60);
			ttl = 80;
			const result4 = await target.get(key, getter);

			expectCallsLike(getter, [], [], []);
			expect(result1).toBe(1);
			expect(result2).toBe(1);
			expect(result3).toBe(2);
			expect(result4).toBe(3);
		});

		it('should call the onPurge callback when purge happens', async () => {
			let count = 0;
			let ttl = 100;
			const getter = jest.fn().mockImplementation(async () => ++count);
			target = new Remembered({ ttl: () => ttl });
			const key = 'key value';
			const onPurge = jest.fn();

			const result = await target.get(key, getter, undefined, onPurge);
			await delay(100);
			ttl = 40;

			expectCallsLike(getter, []);
			expectCallsLike(onPurge, [key]);
			expect(result).toBe(1);
		});
	});
});
