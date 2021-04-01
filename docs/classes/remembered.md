[fluent-iterable - v0.1.1](../README.md) / Remembered

# Class: Remembered

A class that help you remember previous calls for you functions, to avoid new calls while it is not forgotten

## Table of contents

### Constructors

- [constructor](remembered.md#constructor)

### Properties

- [map](remembered.md#map)
- [purgeTask](remembered.md#purgetask)
- [toPurge](remembered.md#topurge)
- [ttl](remembered.md#ttl)

### Methods

- [get](remembered.md#get)
- [loadValue](remembered.md#loadvalue)
- [schedulePurge](remembered.md#schedulepurge)
- [wait](remembered.md#wait)
- [wrap](remembered.md#wrap)

## Constructors

### constructor

\+ **new Remembered**(`config?`: RememberedConfig): [*Remembered*](remembered.md)

#### Parameters:

Name | Type |
:------ | :------ |
`config` | RememberedConfig |

**Returns:** [*Remembered*](remembered.md)

## Properties

### map

• `Private` **map**: *Map*<string, { `purgeTime`: *number* ; `value`: *Promise*<unknown\>  }\>

___

### purgeTask

• `Private` **purgeTask**: *undefined* \| *PromiseLike*<void\>

___

### toPurge

• `Private` **toPurge**: *FastFIFO*<{ `key`: *string* ; `purgeTime`: *number*  }\>

___

### ttl

• `Private` **ttl**: *number*

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

### schedulePurge

▸ `Private`**schedulePurge**(`purgeTime`: *number*, `key`: *string*): *void*

#### Parameters:

Name | Type |
:------ | :------ |
`purgeTime` | *number* |
`key` | *string* |

**Returns:** *void*

___

### wait

▸ `Private`**wait**(`key`: *string*): *Promise*<void\>

#### Parameters:

Name | Type |
:------ | :------ |
`key` | *string* |

**Returns:** *Promise*<void\>

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
