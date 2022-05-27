import { Ttl } from './remembered-config';
import Fifo = require('fast-fifo');
import { delay } from './delay';

export class Pacer<T> {
	private purgeTask: PromiseLike<void> | undefined;
	private toPurge = new Fifo<{
		purgeTime: number;
		payload: T;
		callback?: (payload: T) => void;
	}>();
	private pace: (payload: T) => number;

	constructor(pace: Ttl, private run: (payload: T) => any) {
		this.pace = typeof pace === 'number' ? () => pace : pace;
	}

	schedulePurge(payload: T, callback?: (payload: T) => void) {
		const purgeTime = Date.now() + this.pace(payload);
		this.toPurge.push({ purgeTime, payload, callback });
		if (!this.purgeTask) {
			this.purgeTask = this.wait();
		}
	}

	private async wait(): Promise<void> {
		const current = this.toPurge.shift();
		if (current) {
			const waiting = current.purgeTime - Date.now();
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
