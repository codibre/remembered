export type TtlFunction<TResponse = unknown, TKey = string> = (
	key: TKey,
	response?: TResponse,
) => number;

export type Ttl<TResponse = unknown, TKey = string> =
	| number
	| TtlFunction<TResponse, TKey>;

export type EvictionPolicy = 'LRU' | 'FIFO' | 'MRU';

export interface BaseRememberedConfig<TResponse = unknown, TKey = string> {
	ttl: Ttl<TResponse, TKey>;
	/**
	 * Always keep a persistent last result for the cache when there is one, so the cache can be updated in the background
	 */
	nonBlocking?: boolean;
	onReused?: (key: string) => void;
	evictionPolicy?: EvictionPolicy;
}

export interface EvictionRememberedConfig<TResponse = unknown, TKey = string>
	extends BaseRememberedConfig<TResponse, TKey> {
	evictionPolicy: 'LRU' | 'FIFO' | 'MRU';
	/**
	 * Maximum number of items to store in the cache
	 */
	capacity: number;
}

export interface DefaultRememberedConfig<TResponse = unknown, TKey = string>
	extends BaseRememberedConfig<TResponse, TKey> {}

export type RememberedConfig<TResponse = unknown, TKey = string> =
	| EvictionRememberedConfig<TResponse, TKey>
	| DefaultRememberedConfig<TResponse, TKey>;
