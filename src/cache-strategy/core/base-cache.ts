import { Cache } from './cache';
import { Node, LinkedList } from '../utils/linked-list';

export abstract class BaseCache<TResponse = unknown, TKey = string>
	implements Cache<TResponse, TKey>
{
	protected map: Map<TKey, Node<TResponse, TKey>>;
	protected linkedList: LinkedList<TResponse, TKey>;
	protected size: number;
	protected readonly capacity: number;

	constructor(capacity: number) {
		if (capacity < 0) {
			throw new Error('Capacity must be greater than or equal to 0');
		}

		this.map = new Map<TKey, Node<TResponse, TKey>>();
		this.linkedList = new LinkedList<TResponse, TKey>();

		this.capacity = capacity;
		this.size = 0;
	}

	abstract get(key: TKey): TResponse | Promise<TResponse> | undefined;

	set(key: TKey, value: TResponse | Promise<TResponse>): void {
		if (this.capacity === 0) {
			return;
		}

		const item = this.map.get(key);
		if (item) {
			this.handleExistingItemAccess(item, value);
			return;
		}

		if (this.size === this.capacity) {
			this.evictItem();
		}

		const node = this.linkedList.addNode(key, value);
		this.size++;
		this.map.set(key, node);
	}

	delete(key: TKey): void {
		const item = this.map.get(key);
		if (item) {
			this.linkedList.removeNode(item);
			this.map.delete(key);
			this.size--;
		}
	}

	protected abstract handleExistingItemAccess(
		item: Node<TResponse, TKey>,
		value: TResponse | Promise<TResponse>,
	): void;
	protected abstract evictItem(): void;

	protected getHead(): Node<TResponse, TKey> {
		return this.linkedList.getHead();
	}

	protected getTail(): Node<TResponse, TKey> {
		return this.linkedList.getTail();
	}
}
