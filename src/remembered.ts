import { dontWait } from './dont-wait';
import { Pacer } from './pacer';
import { RememberedConfig } from './remembered-config';

const Empty = Symbol('Empty');

const defaultConfig = { ttl: 0 };
/**
 * A class that help you remember previous calls for you functions, to avoid new calls while it is not forgotten
 */
export class Remembered<TResponse = unknown, TKey = string> {
	private map = new Map<TKey, Promise<TResponse>>();
	private nonBlockingMap = new Map<TKey, TResponse>();
	private pacer: Pacer<TResponse, TKey> | undefined;
	private removeImmediately: boolean;
	private onReused?: (...args: any[]) => void;

	constructor(
		private config: RememberedConfig<TResponse, TKey> = defaultConfig,
	) {
		this.removeImmediately = !config.ttl;
		this.onReused = config.onReused;
		this.pacer = new Pacer(config, (key: TKey) => this.map.delete(key));
	}

	/**
	 * Returns a remembered promise or the resulted promise from the callback
	 * @param key the remembering key, for remembering purposes
	 * @param callback the callback in case nothing is remember
	 * @param noCacheIf an optional condition that, when informed, the cache is not kept
	 * @param ttl an optional ttl that, when informed, replaces the ttl informed in the constructor configuration
	 * @returns the (now) remembered promise
	 */
	async get<R extends TResponse>(
		key: TKey,
		callback: () => PromiseLike<R>,
		noCacheIf?: (result: R) => boolean,
		ttl?: number,
	): Promise<R> {
		if (this.config.nonBlocking) {
			if (this.nonBlockingMap.has(key)) {
				dontWait(() => this.blockingGet(key, callback, noCacheIf, ttl));

				return this.nonBlockingMap.get(key) as R;
			}
		}

		return this.blockingGet(key, callback, noCacheIf, ttl);
	}

	getSync<R extends TResponse>(
		key: TKey,
		callback: () => PromiseLike<R>,
		noCacheIf?: (result: R) => boolean,
		ttl?: number,
	): R | undefined {
		if (!this.config.nonBlocking) {
			throw new Error('getSync is only available for nonBlocking instances');
		}
		dontWait(() => this.blockingGet(key, callback, noCacheIf, ttl));

		return this.nonBlockingMap.get(key) as R | undefined;
	}

	blockingGet<R extends TResponse>(
		key: TKey,
		callback: () => PromiseLike<R>,
		noCacheIf?: (result: R) => boolean,
		ttl?: number,
	): Promise<R> {
		const cached = this.map.get(key);
		if (cached) {
			this.onReused?.(key);
			return cached as Promise<R>;
		}
		const value = this.loadValue(key, callback, noCacheIf, ttl);
		this.map.set(key, value);
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
		getKey: (...args: K) => TKey,
		noCacheIf?: (result: R extends Promise<infer TR> ? TR : never) => boolean,
	): (...args: T) => R {
		return (...args: T): R => {
			const key = getKey(...(args as K));
			return this.get(key, () => callback(...args), noCacheIf) as R;
		};
	}

	clearCache(key: TKey): void | Promise<unknown> {
		this.map.delete(key);
	}

	private async loadValue<R extends TResponse>(
		key: TKey,
		load: () => PromiseLike<R>,
		noCacheIf?: (result: R) => boolean,
		ttl?: number,
	) {
		let result: R | typeof Empty = Empty;
		try {
			result = await load();
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
			} else if (result !== Empty) {
				this.pacer?.schedulePurge(key, ttl, result);
			}
		}
	}
}
