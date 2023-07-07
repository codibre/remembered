import { dontWait } from './dont-wait';
import { Pacer } from './pacer';
import { RememberedConfig } from './remembered-config';

const defaultConfig = { ttl: 0 };
/**
 * A class that help you remember previous calls for you functions, to avoid new calls while it is not forgotten
 */
export class Remembered {
	private map = new Map<string, Promise<unknown>>();
	private nonBlockingMap = new Map<string, unknown>();
	private pacer: Pacer<string> | undefined;
	private removeImmediately: boolean;
	private onReused?: (...args: any[]) => void;

	constructor(private config: RememberedConfig = defaultConfig) {
		this.removeImmediately = !config.ttl;
		this.onReused = config.onReused;
		this.pacer = config.ttl
			? new Pacer(config.ttl, (key: string) => this.map.delete(key))
			: undefined;
	}

	/**
	 * Returns a remembered promise or the resulted promise from the callback
	 * @param key the remembering key, for remembering purposes
	 * @param callback the callback in case nothing is remember
	 * @param noCacheIf a optional condition that, when informed, the cache is not kept
	 * @returns the (now) remembered promise
	 */
	async get<T>(
		key: string,
		callback: () => PromiseLike<T>,
		noCacheIf?: (result: T) => boolean,
		ttl?: number,
	): Promise<T> {
		if (this.config.nonBlocking) {
			if (this.nonBlockingMap.has(key)) {
				dontWait(() => this.blockingGet(key, callback, noCacheIf, ttl));

				return this.nonBlockingMap.get(key) as T;
			}
		}

		return this.blockingGet(key, callback, noCacheIf, ttl);
	}

	getSync<T>(
		key: string,
		callback: () => PromiseLike<T>,
		noCacheIf?: (result: T) => boolean,
		ttl?: number,
	): T | undefined {
		if (!this.config.nonBlocking) {
			throw new Error('getSync is only available for nonBlocking instances');
		}
		dontWait(() => this.blockingGet(key, callback, noCacheIf, ttl));

		return this.nonBlockingMap.get(key) as T | undefined;
	}

	blockingGet<T>(
		key: string,
		callback: () => PromiseLike<T>,
		noCacheIf?: (result: T) => boolean,
		_ttl?: number,
	): Promise<T> {
		const cached = this.map.get(key);
		if (cached) {
			this.onReused?.(key);
			return cached as Promise<T>;
		}
		const value = this.loadValue(key, callback, noCacheIf);
		this.map.set(key, value);
		this.pacer?.schedulePurge(key);
		return value;
	}

	/**
	 * Returns a version of the callback that remembers the result of previous calls and reuse it
	 * @param callback the callback you want to make rememberable
	 * @param getKey a function that returns a remembering key
	 * @returns the rememberable callback
	 */
	wrap<T extends any[], K extends T, R extends Promise<any>>(
		callback: (...args: T) => R,
		getKey: (...args: K) => string,
		noCacheIf?: (result: R extends Promise<infer TR> ? TR : never) => boolean,
	): (...args: T) => R {
		return (...args: T): R => {
			const key = getKey(...(args as K));
			return this.get(key, () => callback(...args), noCacheIf) as R;
		};
	}

	clearCache(key: string): void | Promise<unknown> {
		this.map.delete(key);
	}

	private async loadValue<T>(
		key: string,
		load: () => PromiseLike<T>,
		noCacheIf?: (result: T) => boolean,
	) {
		try {
			const result = await load();
			if (noCacheIf?.(result)) {
				this.map.delete(key);
			} else if (this.config.nonBlocking) {
				this.nonBlockingMap.set(key, result);
			}
			return result;
		} catch (err) {
			this.map.delete(key);
			throw err;
		} finally {
			if (this.removeImmediately) {
				this.map.delete(key);
			}
		}
	}
}
