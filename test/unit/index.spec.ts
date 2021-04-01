import { Remembered } from '../../src';
import * as delayLib from '../../src/delay';
import { EventEmitter } from 'events';
import { expectCallsLike, getNames } from './setup';

const methods = getNames(Remembered);

describe(Remembered.name, () => {
	let timePasser: EventEmitter;
	let target: Remembered;

	beforeEach(() => {
		timePasser = new EventEmitter();
		jest.spyOn(delayLib, 'delay').mockImplementation(
			() =>
				new Promise((resolve) => {
					timePasser.once('delay', resolve);
				}),
		);
		target = new Remembered({
			ttl: 9919,
		});
	});

  describe(methods.get, () => {
    it('should remember the last result until the ttl has passed', async () => {
      let count = 0;
      const getter = jest.fn().mockImplementation(async () => ++count);
      jest.spyOn(Date, 'now').mockImplementation(() => (1 + count) * 9919 - 1);
      const key = 'key value';

      const result1 = await target.get(key, getter);
      timePasser.emit('delay');
      const result2 = await target.get(key, getter);
      timePasser.emit('delay');
      const result3 = await target.get(key, getter);
      timePasser.emit('delay');
      const result4 = await target.get(key, getter);

      expectCallsLike(getter, [], []);
      expect(result1).toBe(1);
      expect(result2).toBe(1);
      expect(result3).toBe(2);
      expect(result4).toBe(2);
    });

    it('should not keep a result that threw an exception', async () => {
      let count = 0;
      const getter = jest.fn().mockImplementation(async () => {
        if (++count === 1) {
          throw new Error('test');
        }
        return count;
      });
      jest.spyOn(Date, 'now').mockImplementation(() => (1 + count) * 9919 - 1);
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
      jest.spyOn(Date, 'now').mockImplementation(() => (1 + count) * 9919 - 1);
      const key = 'key value';

      const [result1, result2] = await Promise.all([target0.get(key, getter), target0.get(key, getter)]);
      const result3 = await target0.get(key, getter);


      expect(result1).toBe(1);
      expect(result2).toBe(1);
      expect(result3).toBe(2);
    });
  });

  describe(methods.wrap, () => {
    it('should return a rememberable callback', async () => {
      let count = 0;
      const getter = jest.fn().mockImplementation(async () => ++count) as (k: string, n?: number) => Promise<number>;
      jest.spyOn(Date, 'now').mockImplementation(() => (1 + count) * 9919 - 1);

      const callback = target.wrap(getter, (k) => k);
      const result1 = await callback('test');
      timePasser.emit('delay');
      const result2 = await callback('test', 1);
      timePasser.emit('delay');
      const result3 = await callback('test', 2);
      timePasser.emit('delay');
      const result4 = await callback('test', 3);

      expectCallsLike(getter, ['test'], ['test', 2]);
      expect(result1).toBe(1);
      expect(result2).toBe(1);
      expect(result3).toBe(2);
      expect(result4).toBe(2);
    });
  });
});
