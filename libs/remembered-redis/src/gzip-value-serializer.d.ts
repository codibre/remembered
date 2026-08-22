import { GzipStrategy, JsonStrategy, Serializer } from 'multi-serializer';
export declare const gzipValueSerializer: Serializer<
	JsonStrategy<any>,
	any,
	import('multi-serializer').Serialized,
	[GzipStrategy],
	import('multi-serializer').Serialized
>;
