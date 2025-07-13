import {
	EvictionRememberedConfig,
	RememberedConfig,
} from '../remembered-config';
import { FifoCache, LruCache, MruCache, SimpleCache } from './implementations';

export function createCache<TResponse = unknown, TKey = string>(
	config: RememberedConfig<TResponse, TKey>,
) {
	switch (config.evictionPolicy) {
		case 'LRU':
			const lruConfig = config as EvictionRememberedConfig<TResponse, TKey>;
			return new LruCache<TResponse, TKey>(lruConfig.capacity);
		case 'FIFO':
			const fifoConfig = config as EvictionRememberedConfig<TResponse, TKey>;
			return new FifoCache<TResponse, TKey>(fifoConfig.capacity);
		case 'MRU':
			const mruConfig = config as EvictionRememberedConfig<TResponse, TKey>;
			return new MruCache<TResponse, TKey>(mruConfig.capacity);
		default:
			return new SimpleCache<TResponse, TKey>();
	}
}
