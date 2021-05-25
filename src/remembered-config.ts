export interface RememberedConfig {
	ttl: number;
	onReused?: (...a: any[]) => void;
}
