export interface Cache<TResponse = unknown, TKey = string> {
	get(key: TKey): TResponse | Promise<TResponse> | undefined;
	set(key: TKey, value: TResponse | Promise<TResponse>): void;
	delete(key: TKey): void;
}
