import { RememberedConfig } from './remembered-config';
import Fifo = require('fast-fifo');
import { delay } from './delay';
import { performance } from 'perf_hooks';

export class Pacer<TResponse = unknown, TKey = string> {
	private purgeTask: PromiseLike<void> | undefined;
	private toPurge = new Fifo<{
		purgeTime: number;
		payload: TKey;
		callback?: (payload: TKey) => void;
	}>();

	constructor(
		private config: RememberedConfig<TResponse, TKey>,
		private run: (payload: TKey) => any,
	) {}

	private getTtl(
		payload: TKey,
		ttl: number | undefined,
		response: TResponse,
	): number {
		if (ttl !== undefined) return ttl;

		return typeof this.config.ttl === 'number'
			? this.config.ttl
			: this.config.ttl(payload, response);
	}

	schedulePurge(
		payload: TKey,
		ttl: number | undefined,
		response: TResponse,
		callback?: (payload: TKey) => void,
	) {
		const now = performance.now();
		ttl = this.getTtl(payload, ttl, response);

		if (ttl === 0) {
			this.run(payload);
			return;
		}

		const purgeTime = now + ttl;

		this.toPurge.push({ purgeTime, payload, callback });
		if (!this.purgeTask) {
			this.purgeTask = this.wait();
		}
	}

	private async wait(): Promise<void> {
		const current = this.toPurge.shift();
		if (current) {
			const waiting = current.purgeTime - performance.now();
			if (waiting > 0) {
				await delay(waiting);
			}
			this.run(current.payload);
			if (current.callback) {
				current.callback(current.payload);
			}
			return this.wait();
		} else {
			this.purgeTask = undefined;
		}
	}
}
