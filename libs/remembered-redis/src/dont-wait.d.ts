import { LogError, TryTo } from './remembered-redis-config';
export declare function dontWaitFactory(
	logError: LogError | undefined,
	tryTo: TryTo,
): (cb: () => Promise<unknown>) => NodeJS.Immediate;
