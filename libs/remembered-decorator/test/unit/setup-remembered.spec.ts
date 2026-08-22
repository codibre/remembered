import { identity } from 'is-this-a-pigeon';
import { Remembered } from 'remembered';
import { setupRemembered, UseRemembered } from '../../src';
import { fName } from './setup';

describe(fName(setupRemembered), () => {
	it('should apply remembered for the decorated methods', async () => {
		const stub = jest.fn().mockImplementation((x) => `result for ${x}`);
		class Test {
			@UseRemembered(identity)
			async test(id: string) {
				return stub(id);
			}
		}

		setupRemembered(
			() =>
				new Remembered({
					ttl: 1000,
				}),
		);
		const instance = new Test();
		const [result1, result2, result3] = await Promise.all([
			instance.test('id1'),
			instance.test('id1'),
			instance.test('id2'),
		]);

		expect(stub).toHaveCallsLike(['id1'], ['id2']);
		expect(result1).toBe('result for id1');
		expect(result2).toBe(result1);
		expect(result3).toBe('result for id2');
	});

	it('should not apply remembered when instanceGetter returns undefined', async () => {
		const stub = jest
			.fn()
			.mockImplementation((x) => ({ info: `result for ${x}` }));
		class Test {
			@UseRemembered(identity)
			async test(id: string) {
				return stub(id);
			}
		}

		setupRemembered(() => undefined);
		const instance = new Test();
		const [result1, result2] = await Promise.all([
			instance.test('id1'),
			instance.test('id1'),
		]);

		expect(stub).toHaveCallsLike(['id1'], ['id1']);
		expect(result1).toEqual({ info: 'result for id1' });
		expect(result2).toEqual({ info: 'result for id1' });
		expect(result2).not.toBe(result1);
	});
});
