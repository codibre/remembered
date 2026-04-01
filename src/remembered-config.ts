export type TtlFunction<TResponse = unknown, TKey = string> = (
	key: TKey,
	response?: TResponse,
) => number;

export type Ttl<TResponse = unknown, TKey = string> =
	| number
	| TtlFunction<TResponse, TKey>;

export type ResultType = 'readonly' | 'mutable';

export interface RememberedConfig<
	TResponse = unknown,
	TKey = string,
	TResultType extends ResultType = 'mutable' | 'readonly',
> {
	ttl: Ttl<TResponse, TKey>;
	/**
	 * Always keep a persistent last result for the cache when there is one, so the cache can be updated in the background
	 */
	nonBlocking?: boolean;
	onReused?: (key: string) => void;
	resultType?: TResultType;
}
