export type Ttl = number | (<T>(request: T) => number);

export interface RememberedConfig {
	ttl: Ttl;
	/**
	 * Always keep a persistent last result for the cache when there is one, so the cache can be updated in the background
	 */
	nonBlocking?: boolean;
	onReused?: (key: string) => void;
}
