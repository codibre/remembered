export interface RememberedConfig {
	ttl: number | (() => number);
	onReused?: (key: string) => void;
}
