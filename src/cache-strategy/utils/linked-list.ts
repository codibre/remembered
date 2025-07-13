export class Node<TResponse = unknown, TKey = string> {
	constructor(
		public key?: TKey,
		public value?: TResponse | Promise<TResponse>,
		public next: Node<TResponse, TKey> | null = null,
		public prev: Node<TResponse, TKey> | null = null,
	) {}
}

export class LinkedList<TResponse = unknown, TKey = string> {
	private head: Node<TResponse, TKey>;
	private tail: Node<TResponse, TKey>;

	constructor() {
		this.head = new Node<TResponse, TKey>();
		this.tail = new Node<TResponse, TKey>();
		this.head.next = this.tail;
		this.tail.prev = this.head;
	}

	addNode(
		key: TKey | undefined,
		value: TResponse | Promise<TResponse> | undefined,
	): Node<TResponse, TKey> {
		const node = new Node<TResponse, TKey>(key, value);

		const headNext = this.head.next;

		this.head.next = node;

		node.prev = this.head;
		node.next = headNext;

		if (headNext) {
			headNext.prev = node;
		}

		return node;
	}

	removeNode(node: Node<TResponse, TKey>): void {
		const nextNode = node.next;
		const prevNode = node.prev;

		if (nextNode) {
			nextNode.prev = prevNode;
		}
		if (prevNode) {
			prevNode.next = nextNode;
		}

		node.next = null;
		node.prev = null;
	}

	getHead(): Node<TResponse, TKey> {
		return this.head;
	}

	getTail(): Node<TResponse, TKey> {
		return this.tail;
	}
}
