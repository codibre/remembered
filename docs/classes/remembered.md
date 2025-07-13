[fluent-iterable - v0.3.1](../README.md) / Remembered

# Class: Remembered

A class that help you remember previous calls for you functions, to avoid new calls while it is not forgotten. Supports configurable cache strategies with eviction policies to manage memory usage.

## Table of contents

### Constructors

- [constructor](remembered.md#constructor)

### Properties

- [map](remembered.md#map)
- [pacer](remembered.md#pacer)
- [removeImmediately](remembered.md#removeimmediately)

### Methods

- [get](remembered.md#get)
- [loadValue](remembered.md#loadvalue)
- [wrap](remembered.md#wrap)

## Constructors

### constructor

\+ **new Remembered**(`config?`: RememberedConfig): [*Remembered*](remembered.md)

Creates a new Remembered instance with optional cache configuration.

#### Parameters:

Name | Type | Description |
:------ | :------ | :------ |
`config` | RememberedConfig | Configuration object with TTL and optional cache strategy settings |

**Returns:** [*Remembered*](remembered.md)

#### Configuration Options:

- `ttl`: Time to live in milliseconds or a function that returns TTL
- `evictionPolicy`: Optional cache eviction policy ('LRU', 'MRU', 'FIFO', or undefined for Simple)
- `capacity`: Maximum number of items to store (required when using eviction policies)
- `nonBlocking`: Whether to keep persistent last result for background updates
- `onReused`: Callback function called when a cached value is reused

#### Examples:

```ts
// Simple cache (default)
const remembered = new Remembered({ ttl: 1000 });

// LRU cache with capacity limit
const remembered = new Remembered({
  ttl: 5000,
  evictionPolicy: 'LRU',
  capacity: 100
});

// Dynamic TTL with MRU eviction
const remembered = new Remembered({
  ttl: (key, response) => key.startsWith('user:') ? 30000 : 5000,
  evictionPolicy: 'MRU',
  capacity: 50
});
```

## Properties

### map

• `Private` **map**: *Map*<string, Promise<any\>\>

___

### pacer

• `Private` **pacer**: *undefined* \| *Pacer*<string\>

___

### removeImmediately

• `Private` **removeImmediately**: *boolean*

## Methods

### get

▸ **get**<T\>(`key`: *string*, `callback`: () => *PromiseLike*<T\>): *PromiseLike*<T\>

Returns a remembered promise or the resulted promise from the callback

#### Type parameters:

Name |
:------ |
`T` |

#### Parameters:

Name | Type | Description |
:------ | :------ | :------ |
`key` | *string* | the remembering key, for remembering purposes   |
`callback` | () => *PromiseLike*<T\> | the callback in case nothing is remember   |

**Returns:** *PromiseLike*<T\>

the (now) remembered promise

___

### loadValue

▸ `Private`**loadValue**<T\>(`key`: *string*, `load`: () => *PromiseLike*<T\>): *Promise*<T\>

#### Type parameters:

Name |
:------ |
`T` |

#### Parameters:

Name | Type |
:------ | :------ |
`key` | *string* |
`load` | () => *PromiseLike*<T\> |

**Returns:** *Promise*<T\>

___

### wrap

▸ **wrap**<T, K, R\>(`callback`: (...`args`: T) => R, `getKey`: (...`args`: K) => *string*): *function*

Returns a version of the callback that remembers the result of previous calls and reuse it

#### Type parameters:

Name | Type |
:------ | :------ |
`T` | *any*[] |
`K` | *any*[] |
`R` | *PromiseLike*<any, R\> |

#### Parameters:

Name | Type | Description |
:------ | :------ | :------ |
`callback` | (...`args`: T) => R | the callback you want to make rememberable   |
`getKey` | (...`args`: K) => *string* | a function that returns a remembering key   |

**Returns:** (...`args`: T) => R

the rememberable callback
