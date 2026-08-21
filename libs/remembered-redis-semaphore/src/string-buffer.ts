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
