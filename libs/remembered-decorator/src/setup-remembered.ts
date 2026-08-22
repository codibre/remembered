import { AbstractClass } from 'is-this-a-pigeon';
import { Remembered } from 'remembered';
import { UseRemembered } from './use-remembered';

export function setupRemembered(
	instanceGetter: (cls: AbstractClass<Object>) => Remembered | undefined,
) {
	for (const item of UseRemembered) {
		const instance = instanceGetter(
			item.target.constructor as AbstractClass<Object>,
		);
		if (instance) {
			(item.target[item.name as keyof typeof item.target] as any).remembered =
				instance;
		}
	}
}
