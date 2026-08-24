/**
 * A simple string buffer class that allows for efficient string concatenation and conditional appending of parts.
 */
export class StringBuffer {
	constructor(private parts: unknown[] = []) {}

	$(...parts: unknown[]) {
		this.parts.push(...parts);
		return this;
	}

	$If(condition: unknown, parts: unknown[]) {
		return condition ? this.$(...parts) : this;
	}

	toString() {
		return this.parts.join('');
	}
}
