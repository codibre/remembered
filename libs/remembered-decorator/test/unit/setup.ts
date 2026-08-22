import 'jest-callslike';

afterEach(() => {
	jest.restoreAllMocks();
	jest.clearAllMocks();
});

export function fName(result: Function): any {
	return `${result.name}()`;
}

export function getNames<T extends object>(c: { prototype: T }): T {
	return new Proxy(c.prototype, {
		get(target: T, property: string) {
			const result: Function = target[property as keyof T] as any;
			if (!result) {
				throw new Error(`Method ${property} doesn't exist`);
			}

			return `.${fName(result)}`;
		},
	});
}
