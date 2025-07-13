import {
	LinkedList,
	Node,
} from '../../../../src/cache-strategy/utils/linked-list';

describe('LinkedList', () => {
	let linkedList: LinkedList<number, string>;

	beforeEach(() => {
		linkedList = new LinkedList<number, string>();
	});

	describe('constructor', () => {
		it('should create an empty linked list with head and tail sentinels', () => {
			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head).toBeInstanceOf(Node);
			expect(tail).toBeInstanceOf(Node);
			expect(head.next).toBe(tail);
			expect(tail.prev).toBe(head);
		});
	});

	describe('Node', () => {
		it('should create a node with key and value', () => {
			const node = new Node('key1', 100);
			expect(node.key).toBe('key1');
			expect(node.value).toBe(100);
			expect(node.next).toBeNull();
			expect(node.prev).toBeNull();
		});

		it('should create a node with default values', () => {
			const node = new Node();
			expect(node.key).toBeUndefined();
			expect(node.value).toBeUndefined();
			expect(node.next).toBeNull();
			expect(node.prev).toBeNull();
		});

		it('should create a node with custom next and prev', () => {
			const nextNode = new Node('key2', 200);
			const prevNode = new Node('key0', 0);
			const node = new Node('key1', 100, nextNode, prevNode);

			expect(node.key).toBe('key1');
			expect(node.value).toBe(100);
			expect(node.next).toBe(nextNode);
			expect(node.prev).toBe(prevNode);
		});
	});

	describe('addNode', () => {
		it('should add a node to the front of the list and return the created node', () => {
			const node1 = linkedList.addNode('key1', 100);
			const node2 = linkedList.addNode('key2', 200);

			expect(node1).toBeInstanceOf(Node);
			expect(node2).toBeInstanceOf(Node);
			expect(node1.key).toBe('key1');
			expect(node1.value).toBe(100);
			expect(node2.key).toBe('key2');
			expect(node2.value).toBe(200);

			const head = linkedList.getHead();
			expect(head.next).toBe(node2);
			expect(node2.next).toBe(node1);
			expect(node1.next).toBe(linkedList.getTail());
		});

		it('should maintain correct prev pointers', () => {
			const node1 = linkedList.addNode('key1', 100);
			const node2 = linkedList.addNode('key2', 200);

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(node2.prev).toBe(head);
			expect(node1.prev).toBe(node2);
			expect(tail.prev).toBe(node1);
		});

		it('should handle adding single node', () => {
			const node = linkedList.addNode('key1', 100);

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(node);
			expect(node.prev).toBe(head);
			expect(node.next).toBe(tail);
			expect(tail.prev).toBe(node);
		});

		it('should handle undefined key and value', () => {
			const node = linkedList.addNode(undefined, undefined);

			expect(node.key).toBeUndefined();
			expect(node.value).toBeUndefined();
			expect(node.prev).toBe(linkedList.getHead());
			expect(node.next).toBe(linkedList.getTail());
		});
	});

	describe('removeNode', () => {
		it('should remove a node from the middle of the list', () => {
			const node1 = linkedList.addNode('key1', 100);
			const node2 = linkedList.addNode('key2', 200);
			const node3 = linkedList.addNode('key3', 300);

			linkedList.removeNode(node2);

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(node3);
			expect(node3.next).toBe(node1);
			expect(node1.next).toBe(tail);
			expect(node3.prev).toBe(head);
			expect(node1.prev).toBe(node3);
			expect(tail.prev).toBe(node1);

			// Removed node should have null pointers
			expect(node2.next).toBeNull();
			expect(node2.prev).toBeNull();
		});

		it('should remove the first node', () => {
			const node1 = linkedList.addNode('key1', 100);
			const node2 = linkedList.addNode('key2', 200);

			linkedList.removeNode(node2); // node2 is first (most recently added)

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(node1);
			expect(node1.next).toBe(tail);
			expect(node1.prev).toBe(head);
			expect(tail.prev).toBe(node1);
		});

		it('should remove the last node', () => {
			const node1 = linkedList.addNode('key1', 100);
			const node2 = linkedList.addNode('key2', 200);

			linkedList.removeNode(node1); // node1 is last (least recently added)

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(node2);
			expect(node2.next).toBe(tail);
			expect(node2.prev).toBe(head);
			expect(tail.prev).toBe(node2);
		});

		it('should handle removing the only node', () => {
			const node = linkedList.addNode('key1', 100);

			linkedList.removeNode(node);

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(tail);
			expect(tail.prev).toBe(head);
			expect(node.next).toBeNull();
			expect(node.prev).toBeNull();
		});

		it('should handle removing a node that is not in the list', () => {
			const node1 = linkedList.addNode('key1', 100);
			const node2 = new Node('key2', 200); // Create node outside of list

			// Try to remove node2 which is not in the list
			expect(() => linkedList.removeNode(node2)).not.toThrow();

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(node1);
			expect(node1.next).toBe(tail);
		});
	});

	describe('complex operations', () => {
		it('should handle multiple add and remove operations', () => {
			const node1 = linkedList.addNode('key1', 100);
			const node2 = linkedList.addNode('key2', 200);
			const node3 = linkedList.addNode('key3', 300);

			// Remove middle node
			linkedList.removeNode(node2);

			// Add new node
			const node4 = linkedList.addNode('key4', 400);

			// Remove first node
			linkedList.removeNode(node4);

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(node3);
			expect(node3.next).toBe(node1);
			expect(node1.next).toBe(tail);
		});

		it('should maintain correct order after complex operations', () => {
			const nodes = [];
			for (let i = 0; i < 5; i++) {
				nodes.push(linkedList.addNode(`key${i}`, i));
			}

			// Remove nodes 1 and 3
			linkedList.removeNode(nodes[1]);
			linkedList.removeNode(nodes[3]);

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			// Order should be: head -> node4 -> node2 -> node0 -> tail
			expect(head.next).toBe(nodes[4]);
			expect(nodes[4].next).toBe(nodes[2]);
			expect(nodes[2].next).toBe(nodes[0]);
			expect(nodes[0].next).toBe(tail);
		});
	});

	describe('edge cases', () => {
		it('should handle removing a node multiple times', () => {
			const node = linkedList.addNode('key1', 100);

			linkedList.removeNode(node);
			expect(() => linkedList.removeNode(node)).not.toThrow();
		});

		it('should handle rapid add and remove operations', () => {
			const nodes = [];
			for (let i = 0; i < 10; i++) {
				nodes.push(linkedList.addNode(`key${i}`, i));
			}

			// Remove all nodes
			nodes.forEach((node) => linkedList.removeNode(node));

			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(tail);
			expect(tail.prev).toBe(head);
		});

		it('should handle adding nodes with null/undefined values', () => {
			const node1 = linkedList.addNode('key1', null as any);
			const node2 = linkedList.addNode('key2', undefined);

			expect(node1.value).toBeNull();
			expect(node2.value).toBeUndefined();
		});
	});

	describe('getHead and getTail', () => {
		it('should return the same head and tail instances', () => {
			const head1 = linkedList.getHead();
			const head2 = linkedList.getHead();
			const tail1 = linkedList.getTail();
			const tail2 = linkedList.getTail();

			expect(head1).toBe(head2);
			expect(tail1).toBe(tail2);
		});

		it('should maintain head and tail relationship', () => {
			const head = linkedList.getHead();
			const tail = linkedList.getTail();

			expect(head.next).toBe(tail);
			expect(tail.prev).toBe(head);
		});
	});
});
