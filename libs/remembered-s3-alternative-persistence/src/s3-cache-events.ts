export interface S3CacheSuccessSaveEventMetadata {
	persistenceType: 'redis' | 's3';
	key: string;
}

export interface S3CacheSaveEventMetadata extends S3CacheSuccessSaveEventMetadata {
	errorMessage: string;
	syscall?: string;
	code?: string;
}

export type S3CacheEvents = {
	saveError: (message: string, meta: S3CacheSaveEventMetadata) => void;
	fetchingError: (message: string, meta: S3CacheSaveEventMetadata) => void;
	saveSuccess: (message: string, meta: S3CacheSuccessSaveEventMetadata) => void;
	fetchingSuccess: (
		message: string,
		meta: S3CacheSuccessSaveEventMetadata,
	) => void;
};
