export type Ttl = number | (<T>(request: T) => number);

export interface RememberedConfig {
	ttl: Ttl;
	onReused?: (key: string) => void;
}
