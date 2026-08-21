import { createMethodDecorator } from 'decorator-builder';
import { Remembered } from 'remembered';

export const UseRemembered = createMethodDecorator<
	(getKey: (...args: any[]) => string, noCacheIf?: (a: any) => boolean) => void
>((item) => {
	const previous = item.target[
		item.name as keyof typeof item.target
	] as Function;
	const applied = function (this: any, ...args: any[]) {
		const remembered: Remembered | undefined = (
			item.target[item.name as keyof typeof item.target] as any
		).remembered;
		const call = () => previous.call(this, ...args);
		return remembered
			? remembered.get(item.args[0](...args), call, item.args[1])
			: call();
	};
	(item.target[item.name as keyof typeof item.target] as any) = applied;
	if (item.descriptor.set) {
		item.descriptor.set(applied);
	} else {
		item.descriptor.value = applied;
	}
});
