import { BaseCache } from '../core/base-cache';
import { Node } from '../utils/linked-list';

export class FifoCache<TResponse = unknown, TKey = string> extends BaseCache<
	TResponse,
	TKey
> {
	get(key: TKey): TResponse | Promise<TResponse> | undefined {
		const item = this.map.get(key);
		if (item) {
			return item.value;
		}
		return undefined;
	}

	protected handleExistingItemAccess(
		item: Node<TResponse, TKey>,
		value: TResponse | Promise<TResponse>,
	): void {
		item.value = value;
	}

	protected evictItem(): void {
		const nodeToRemove = this.getTail().prev;
		if (nodeToRemove) {
			this.linkedList.removeNode(nodeToRemove);
			if (nodeToRemove.key) {
				this.map.delete(nodeToRemove.key);
			}
		}
		this.size--;
	}
}
