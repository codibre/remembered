import { Remembered } from 'remembered';
import { getRememberedByClassFactory } from '../../src';
import { fName } from './setup';

describe(fName(getRememberedByClassFactory), () => {
	it('should return always the same remembered instance for the same informed class', () => {
		class Test1 {}
		class Test2 {}
		const stub = jest.fn().mockImplementation(() => new Remembered());

		const getRememberedByClass = getRememberedByClassFactory(stub);
		const result1 = getRememberedByClass(Test1);
		const result2 = getRememberedByClass(Test1);
		const result3 = getRememberedByClass(Test2);

		expect(stub).toHaveCallsLike([Test1], [Test2]);
		expect(result1).toBeInstanceOf(Remembered);
		expect(result1).toBe(result2);
		expect(result3).toBeInstanceOf(Remembered);
		expect(result3).not.toBe(result1);
	});

	it('should return undefined when create function returns undefined', () => {
		const stub = jest.fn();
		class Test1 {}

		const getRememberedByClass = getRememberedByClassFactory(stub);
		const result1 = getRememberedByClass(Test1);

		expect(stub).toHaveCallsLike([Test1]);
		expect(result1).toBeUndefined();
	});
});
