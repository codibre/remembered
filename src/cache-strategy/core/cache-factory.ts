import {
	EvictionRememberedConfig,
	RememberedConfig,
} from '../../remembered-config';
import { FifoCache } from '../implementations/fifo-cache';
import { LruCache } from '../implementations/lru-cache';
import { MruCache } from '../implementations/mru-cache';
import { SimpleCache } from '../implementations/simple-cache';

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
