import { Cache } from '../core/cache';

export class SimpleCache<TResponse = unknown, TKey = string>
	implements Cache<TResponse, TKey>
{
	private map: Map<TKey, TResponse | Promise<TResponse>>;

	constructor() {
		this.map = new Map<TKey, TResponse | Promise<TResponse>>();
	}

	get(key: TKey): TResponse | Promise<TResponse> | undefined {
		return this.map.get(key);
	}

	set(key: TKey, value: TResponse | Promise<TResponse>) {
		this.map.set(key, value);
	}

	delete(key: TKey) {
		const item = this.map.get(key);
		if (item) {
			this.map.delete(key);
		}
	}
}
