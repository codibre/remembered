import Fifo = require('fast-fifo');
import { delay } from './delay';

export class Pacer<T> {
	private purgeTask: PromiseLike<void> | undefined;
	private toPurge = new Fifo<{ purgeTime: number; payload: T }>();

	constructor(private pace: number, private run: (payload: T) => any) {}

	schedulePurge(payload: T) {
		const purgeTime = Date.now() + this.pace;
		this.toPurge.push({ purgeTime, payload });
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
			return this.wait();
		} else {
			this.purgeTask = undefined;
		}
	}
}
