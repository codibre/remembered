[fluent-iterable - v0.2.1](../README.md) / Remembered

# Class: Remembered

A class that help you remember previous calls for you functions, to avoid new calls while it is not forgotten

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

#### Parameters:

Name | Type |
:------ | :------ |
`config` | RememberedConfig |

**Returns:** [*Remembered*](remembered.md)

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
