import { BaseCache } from '../core/base-cache';
import { Node } from '../utils/linked-list';

export class MruCache<TResponse = unknown, TKey = string> extends BaseCache<
	TResponse,
	TKey
> {
	get(key: TKey): TResponse | Promise<TResponse> | undefined {
		const item = this.map.get(key);
		if (item) {
			this.linkedList.removeNode(item);
			this.linkedList.addNode(item.key, item.value);
			return item.value;
		}
		return undefined;
	}

	protected handleExistingItemAccess(
		item: Node<TResponse, TKey>,
		value: TResponse | Promise<TResponse>,
	): void {
		this.linkedList.removeNode(item);
		item.value = value;
		this.linkedList.addNode(item.key, item.value);
	}

	protected evictItem(): void {
		const nodeToRemove = this.getHead().next;
		if (nodeToRemove) {
			this.linkedList.removeNode(nodeToRemove);
			if (nodeToRemove.key) {
				this.map.delete(nodeToRemove.key);
			}
		}
		this.size--;
	}
}
