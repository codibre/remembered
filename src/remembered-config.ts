export interface RememberedConfig {
	ttl: number;
	onReused?: (key: string) => void;
}
