import { promisify } from 'util';
import { dontWait } from '../../src/dont-wait';
import { expectCallsLike } from './setup';
const wait = promisify(setTimeout);

describe(dontWait.name, () => {
	let callback: jest.SpyInstance;
	let errorCallback: jest.SpyInstance;

	beforeEach(() => {
		callback = jest.fn().mockResolvedValue('something');
		errorCallback = jest.fn();
	});

	it('should execute callback on the next tick', async () => {
		dontWait(callback as any);

		expectCallsLike(callback);

		await wait(1);

		expectCallsLike(callback, []);
	});

	it('should execute dontWait() error callback on the next tick', async () => {
		const error = new Error();
		callback.mockRejectedValue(error);

		dontWait(callback as any, errorCallback as any);

		expectCallsLike(callback);
		expectCallsLike(errorCallback);

		await wait(1);

		expectCallsLike(callback, []);
		expectCallsLike(errorCallback, [error]);
	});
});
