[fluent-iterable - v0.0.3](../README.md) / S3Cache

# Class: S3Cache

## Hierarchy

- `TypedEventEmitter`<[`S3CacheEvents`](../README.md#s3cacheevents)\>

  ↳ **`S3Cache`**

## Implements

- `AlternativePersistence`
- `TypedEventEmitter`<[`S3CacheEvents`](../README.md#s3cacheevents)\>

## Table of contents

### Constructors

- [constructor](S3Cache.md#constructor)

### Accessors

- [maxSavingDelay](S3Cache.md#maxsavingdelay)

### Methods

- [\_getFromRedis](S3Cache.md#_getfromredis)
- [\_getObjectKey](S3Cache.md#_getobjectkey)
- [\_getRedisKey](S3Cache.md#_getrediskey)
- [\_saveOnRedis](S3Cache.md#_saveonredis)
- [addListener](S3Cache.md#addlistener)
- [emit](S3Cache.md#emit)
- [eventNames](S3Cache.md#eventnames)
- [get](S3Cache.md#get)
- [getMaxListeners](S3Cache.md#getmaxlisteners)
- [listenerCount](S3Cache.md#listenercount)
- [listeners](S3Cache.md#listeners)
- [off](S3Cache.md#off)
- [on](S3Cache.md#on)
- [once](S3Cache.md#once)
- [prependListener](S3Cache.md#prependlistener)
- [prependOnceListener](S3Cache.md#prependoncelistener)
- [rawListeners](S3Cache.md#rawlisteners)
- [removeAllListeners](S3Cache.md#removealllisteners)
- [removeListener](S3Cache.md#removelistener)
- [save](S3Cache.md#save)
- [setMaxListeners](S3Cache.md#setmaxlisteners)

## Constructors

### constructor

• **new S3Cache**(`options`, `s3`, `redis?`)

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`S3CacheOptions`](../interfaces/S3CacheOptions.md) |
| `s3` | `S3` |
| `redis?` | `Redis` |

#### Inherited from

TypedEmitter<S3CacheEvents\>.constructor

## Accessors

### maxSavingDelay

• `get` **maxSavingDelay**(): `number`

#### Returns

`number`

## Methods

### \_getFromRedis

▸ `Private` **_getFromRedis**(`key`): `Promise`<`undefined` \| `string` \| `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`undefined` \| `string` \| `Buffer`\>

___

### \_getObjectKey

▸ `Private` **_getObjectKey**(`key`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`string`

___

### \_getRedisKey

▸ `Private` **_getRedisKey**(`key`): `string`

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`string`

___

### \_saveOnRedis

▸ `Private` **_saveOnRedis**(`key`, `content`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `content` | `string` \| `Buffer` |

#### Returns

`Promise`<`void`\>

___

### addListener

▸ **addListener**<`E`\>(`event`, `listener`): [`S3Cache`](S3Cache.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`S3CacheEvents`](../README.md#s3cacheevents)[`E`] |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.addListener

___

### emit

▸ **emit**<`E`\>(`event`, ...`args`): `boolean`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `...args` | `Parameters`<[`S3CacheEvents`](../README.md#s3cacheevents)[`E`]\> |

#### Returns

`boolean`

#### Inherited from

TypedEmitter.emit

___

### eventNames

▸ **eventNames**(): (`string` \| `symbol`)[]

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

TypedEmitter.eventNames

___

### get

▸ **get**(`key`): `Promise`<`undefined` \| `string` \| `Buffer`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |

#### Returns

`Promise`<`undefined` \| `string` \| `Buffer`\>

___

### getMaxListeners

▸ **getMaxListeners**(): `number`

#### Returns

`number`

#### Inherited from

TypedEmitter.getMaxListeners

___

### listenerCount

▸ **listenerCount**<`E`\>(`event`): `number`

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

`number`

#### Inherited from

TypedEmitter.listenerCount

___

### listeners

▸ **listeners**<`E`\>(`event`): [`S3CacheEvents`](../README.md#s3cacheevents)[`E`][]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

[`S3CacheEvents`](../README.md#s3cacheevents)[`E`][]

#### Inherited from

TypedEmitter.listeners

___

### off

▸ **off**<`E`\>(`event`, `listener`): [`S3Cache`](S3Cache.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`S3CacheEvents`](../README.md#s3cacheevents)[`E`] |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.off

___

### on

▸ **on**<`E`\>(`event`, `listener`): [`S3Cache`](S3Cache.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`S3CacheEvents`](../README.md#s3cacheevents)[`E`] |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.on

___

### once

▸ **once**<`E`\>(`event`, `listener`): [`S3Cache`](S3Cache.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`S3CacheEvents`](../README.md#s3cacheevents)[`E`] |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.once

___

### prependListener

▸ **prependListener**<`E`\>(`event`, `listener`): [`S3Cache`](S3Cache.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`S3CacheEvents`](../README.md#s3cacheevents)[`E`] |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.prependListener

___

### prependOnceListener

▸ **prependOnceListener**<`E`\>(`event`, `listener`): [`S3Cache`](S3Cache.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`S3CacheEvents`](../README.md#s3cacheevents)[`E`] |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.prependOnceListener

___

### rawListeners

▸ **rawListeners**<`E`\>(`event`): [`S3CacheEvents`](../README.md#s3cacheevents)[`E`][]

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |

#### Returns

[`S3CacheEvents`](../README.md#s3cacheevents)[`E`][]

#### Inherited from

TypedEmitter.rawListeners

___

### removeAllListeners

▸ **removeAllListeners**<`E`\>(`event?`): [`S3Cache`](S3Cache.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event?` | `E` |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.removeAllListeners

___

### removeListener

▸ **removeListener**<`E`\>(`event`, `listener`): [`S3Cache`](S3Cache.md)

#### Type parameters

| Name | Type |
| :------ | :------ |
| `E` | extends keyof [`S3CacheEvents`](../README.md#s3cacheevents) |

#### Parameters

| Name | Type |
| :------ | :------ |
| `event` | `E` |
| `listener` | [`S3CacheEvents`](../README.md#s3cacheevents)[`E`] |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.removeListener

___

### save

▸ **save**(`key`, `content`): `Promise`<`void`\>

#### Parameters

| Name | Type |
| :------ | :------ |
| `key` | `string` |
| `content` | `string` \| `Buffer` |

#### Returns

`Promise`<`void`\>

___

### setMaxListeners

▸ **setMaxListeners**(`maxListeners`): [`S3Cache`](S3Cache.md)

#### Parameters

| Name | Type |
| :------ | :------ |
| `maxListeners` | `number` |

#### Returns

[`S3Cache`](S3Cache.md)

#### Inherited from

TypedEmitter.setMaxListeners
