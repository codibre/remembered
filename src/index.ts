/* eslint-disable @typescript-eslint/no-explicit-any */
import { delay } from './delay';
import { RememberedConfig } from './remembered-config';
import Fifo = require('fast-fifo');

const defaultConfig = { ttl: 0 };
/**
 * A class that help you remember previous calls for you functions, to avoid new calls while it is not forgotten
 */
export class Remembered {
	private map = new Map<
		string,
		{ purgeTime: number; value: Promise<unknown> }
	>();
	private purgeTask: PromiseLike<void> | undefined;
	private toPurge = new Fifo<{ purgeTime: number; key: string }>();
  private ttl;

	constructor(config: RememberedConfig = defaultConfig) {
    this.ttl = config.ttl;
  }

  /**
   * Returns a remembered promise or the resulted promise from the callback
   * @param key the remembering key, for remembering purposes
   * @param callback the callback in case nothing is remember
   * @returns the (now) remembered promise
   */
	get<T>(key: string, callback: () => PromiseLike<T>): PromiseLike<T> {
		const cached = this.map.get(key);
		if (cached) {
			return cached.value as PromiseLike<T>;
		}
		const value = this.loadValue(key, callback);
		const purgeTime = Date.now() + this.ttl;
		this.map.set(key, { value, purgeTime });
		if (this.ttl > 0) {
			this.schedulePurge(purgeTime, key);
		}
		return value;
	}

  /**
   * Returns a version of the callback that remembers the result of previous calls and reuse it
   * @param callback the callback you want to make rememberable
   * @param getKey a function that returns a remembering key
   * @returns the rememberable callback
   */
	wrap<T extends any[], K extends T, R extends PromiseLike<any>>(
		callback: (...args: T) => R,
		getKey: (...args: K) => string,
	): (...args: T) => R {
		return (...args: T): R => {
			const key = getKey(...(args as K));
			return this.get(key, () => callback(...args)) as R;
		};
	}

	private async loadValue<T>(key: string, load: () => PromiseLike<T>) {
		try {
			return await load();
		} catch (err) {
			this.map.delete(key);
			throw err;
		} finally {
			if (this.ttl === 0) {
				this.map.delete(key);
			}
		}
	}

	private schedulePurge(purgeTime: number, key: string) {
		this.toPurge.push({ purgeTime, key });
		if (!this.purgeTask) {
			this.purgeTask = new Promise(async (resolve) => {
				let current = this.toPurge.shift();
				while (current) {
					const waiting = current.purgeTime - Date.now();
					if (waiting > 0) {
						await delay(waiting);
					}
					this.map.delete(key);
					current = this.toPurge.shift();
				}
				this.purgeTask = undefined;
				resolve();
			});
		}
	}
}
