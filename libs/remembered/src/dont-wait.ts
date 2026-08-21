export function dontWait(
	callback: () => PromiseLike<unknown>,
	errorCallback?: (err: Error) => void,
): void {
	process.nextTick(async () => {
		try {
			await callback();
		} catch (error) {
			errorCallback?.(error as Error);
		}
	});
}
