fluent-iterable - v0.0.3

# fluent-iterable - v0.0.3

## Table of contents

### Classes

- [S3Cache](classes/S3Cache.md)

### Interfaces

- [S3CacheOptions](interfaces/S3CacheOptions.md)
- [S3CacheSaveEventMetadata](interfaces/S3CacheSaveEventMetadata.md)

### Type aliases

- [S3CacheEvents](README.md#s3cacheevents)

## Type aliases

### S3CacheEvents

Ƭ **S3CacheEvents**: `Object`

#### Type declaration

| Name | Type |
| :------ | :------ |
| `fetchingError` | (`message`: `string`, `meta`: [`S3CacheSaveEventMetadata`](interfaces/S3CacheSaveEventMetadata.md)) => `void` |
| `saveError` | (`message`: `string`, `meta`: [`S3CacheSaveEventMetadata`](interfaces/S3CacheSaveEventMetadata.md)) => `void` |
