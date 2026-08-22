import { S3CacheOptions } from './s3-cache-options';
import { AlternativePersistence } from '@remembered/redis';
import { PutObjectCommandInput, S3 } from '@aws-sdk/client-s3';
import { Redis } from 'ioredis';
import { EventEmitter } from 'events';
import TypedEmitter from 'typed-emitter';
import {
	S3CacheEvents,
	S3CacheSuccessSaveEventMetadata,
} from './s3-cache-events';

interface AWSError {
	message: string;
	code: string;
	syscall: string;
}

const persistanceTypes: ['redis', 's3'] = ['redis', 's3'];

export interface S3Cache extends TypedEmitter<S3CacheEvents> {}
export class S3Cache
	implements AlternativePersistence, TypedEmitter<S3CacheEvents>
{
	constructor(
		private options: S3CacheOptions,
		private s3: S3,
		private redis?: Redis,
	) {}

	get maxSavingDelay() {
		return this.options.maxSavingDelay;
	}

	get maxResultsPerSave() {
		return this.options.maxResultsPerSave;
	}

	set maxResultsPerSave(value) {
		this.options.maxResultsPerSave = value;
	}

	private async _getFromRedis(
		key: string,
	): Promise<string | Buffer | null | undefined> {
		return await this.redis?.getBuffer(key);
	}

	private async _saveOnRedis(
		key: string,
		content: string | Buffer,
	): Promise<boolean | void> {
		if (this.options.transientTtl) {
			await this.redis?.setex(key, this.options.transientTtl, content);
			return true;
		}
	}

	async save(key: string, content: string | Buffer): Promise<void> {
		const objectKey = this._getObjectKey(key);
		const { bucketName } = this.options;

		const params = {
			Body: content,
			Bucket: this.options.bucketName,
			Key: objectKey,
			ContentType: 'application/json',
		};

		const redisKey = this._getRedisKey(objectKey);
		const results = await Promise.allSettled([
			this._saveOnRedis(redisKey, content),
			this._saveOnS3(params),
		]);

		results.forEach((x, index) => {
			if (x.status === 'rejected' || x.value) {
				const persistenceType = persistanceTypes[index];
				const meta: S3CacheSuccessSaveEventMetadata = {
					persistenceType,
					key:
						persistenceType === 's3'
							? this.getLogKey(bucketName, objectKey)
							: redisKey,
				};
				if (x.status === 'rejected') {
					const reason = x.reason as AWSError;
					this.emit(
						'saveError',
						'Error while persisting cache',
						Object.assign(meta, {
							errorMessage: reason.message,
							syscall: reason.syscall,
						}),
					);
				} else {
					this.emit('saveSuccess', 'Cache persisted', meta);
				}
			}
		});
	}

	public shouldUseAlternativePersistence(content: unknown, ttl: number) {
		if (this.options.shouldUseAlternativePersistence) {
			return this.options.shouldUseAlternativePersistence(content, ttl);
		}
		return true;
	}

	private async _saveOnS3(params: PutObjectCommandInput) {
		await this.s3.putObject(params);
		return true;
	}

	private getLogKey(bucketName: string, objectKey: string): string {
		return `${bucketName}/${objectKey}`;
	}

	async get(
		key: string,
		firstCheck?: boolean,
	): Promise<string | Buffer | undefined> {
		const s3Key = this._getObjectKey(key);
		const redisKey = this._getRedisKey(s3Key);
		const metaRedis: S3CacheSuccessSaveEventMetadata = {
			persistenceType: 'redis',
			key: redisKey,
		};
		try {
			const redisResult = await this._getFromRedis(redisKey);
			if (redisResult) {
				this.emit('fetchingSuccess', 'Cache retrieved', metaRedis);
				return redisResult;
			}
		} catch (err) {
			if (!firstCheck) {
				const error = err as AWSError;
				this.emit(
					'fetchingError',
					'error while fetching from redis',
					Object.assign(metaRedis, {
						errorMessage: error.message,
					}),
				);
			}
		}

		const { bucketName } = this.options;
		const metaS3: S3CacheSuccessSaveEventMetadata = {
			persistenceType: 's3',
			key: this.getLogKey(bucketName, s3Key),
		};

		try {
			const params = {
				Bucket: this.options.bucketName,
				Key: s3Key,
			};

			const { Body } = await this.s3.getObject(params);
			if (Body) {
				const result = Buffer.from(await Body.transformToByteArray());
				if (result.length) {
					this.emit('fetchingSuccess', 'Cache retrieved', metaS3);
					await this._saveOnRedis(redisKey, result);
					return result;
				}
			}

			return undefined;
		} catch (err) {
			if (!firstCheck) {
				const error = err as AWSError;
				this.emit(
					'fetchingError',
					'error while fetching from S3',
					Object.assign(metaS3, {
						errorMessage: error.message,
					}),
				);
			}
			return undefined;
		}
	}

	private _getObjectKey(key: string): string {
		return `${this.options.prefix || 'cache'}/${key}.bin`;
	}

	private _getRedisKey(key: string) {
		return `${this.options.transientPrefix || 'transient'}:${key}`;
	}
}
Object.setPrototypeOf(S3Cache.prototype, EventEmitter.prototype);
Object.setPrototypeOf(S3Cache, EventEmitter);
