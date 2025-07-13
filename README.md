[![Actions Status](https://github.com/Codibre/remembered/workflows/build/badge.svg)](https://github.com/Codibre/remembered/actions)
[![Actions Status](https://github.com/Codibre/remembered/workflows/test/badge.svg)](https://github.com/Codibre/remembered/actions)
[![Actions Status](https://github.com/Codibre/remembered/workflows/lint/badge.svg)](https://github.com/Codibre/remembered/actions)
[![Test Coverage](https://api.codeclimate.com/v1/badges/e6e1f5633ac8cd5d5d48/test_coverage)](https://codeclimate.com/github/Codibre/remembered/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/e6e1f5633ac8cd5d5d48/maintainability)](https://codeclimate.com/github/Codibre/remembered/maintainability)
[![Packages](https://david-dm.org/Codibre/remembered.svg)](https://david-dm.org/Codibre/remembered)
[![npm version](https://badge.fury.io/js/remembered.svg)](https://badge.fury.io/js/remembered)

A module to remember for a given time the promises you made, with configurable cache strategies and eviction policies.

# How to install

```
npm install remembered
```

# Usage

## Basic Usage

Create a new Remembered instance giving the ttl you want, in ms.

``` ts
const remembered = new Remembered({ ttl: 1000 });
```

Now, just call the **get** method informing a remembering key and a callback:

```ts
const callback = () => new Promise<number>((resolve) => {
  setTimeout(200, () => resolve(Date.now()));
});

const [r1, r2, r3] = await Promise.all([
  remembered.get('test', callback),
  remembered.get('test', callback),
  remembered.get('test', callback),
]);
```

In the above example, **r1**, **r2** and **r3** will receive the same exact promise.
Remembered don't "cache" the result of your async operation: it caches the promise itself.

This is very useful for concurrent tasks where you have the same heavy call and you want it to happen just once.
In this example, the promise is resolved in 200 milliseconds, but the ttl is 1 second and it starts to count not after the promise is resolved, but when the promise is made. In other words, exactly 1 second after the first call, the callback will need to be called again.

If you want for the promise to be remembered just while it is not resolved, you can use **ttl** 0. In this case, while the promise is pending, Remembered will return the same reference, but, after it is resolved, then callback will be called

## Cache Strategies and Eviction Policies

Remembered supports different cache strategies with configurable eviction policies to manage memory usage:

### Available Eviction Policies

- **LRU (Least Recently Used)**: Removes the least recently accessed item when capacity is reached
- **MRU (Most Recently Used)**: Removes the most recently accessed item when capacity is reached  
- **FIFO (First In, First Out)**: Removes the oldest item when capacity is reached
- **Simple**: No eviction policy, stores items indefinitely (default)

### Configuration Options

```ts
interface RememberedConfig<TResponse = unknown, TKey = string> {
  ttl: number | TtlFunction<TResponse, TKey>;
  evictionPolicy?: 'LRU' | 'MRU' | 'FIFO';
  capacity?: number; // Required when using eviction policies
  nonBlocking?: boolean;
  onReused?: (key: string) => void;
}
```

### Examples

#### LRU Cache with Capacity Limit

```ts
const remembered = new Remembered({
  ttl: 5000,
  evictionPolicy: 'LRU',
  capacity: 100
});
```

#### MRU Cache for Recent Items

```ts
const remembered = new Remembered({
  ttl: 3000,
  evictionPolicy: 'MRU', 
  capacity: 50
});
```

#### FIFO Cache for Time-based Eviction

```ts
const remembered = new Remembered({
  ttl: 10000,
  evictionPolicy: 'FIFO',
  capacity: 200
});
```

#### Simple Cache (Default)

```ts
const remembered = new Remembered({
  ttl: 5000
  // No eviction policy = Simple cache
});
```

### Advanced Configuration

#### Dynamic TTL Function

```ts
const remembered = new Remembered({
  ttl: (key: string, response?: any) => {
    // Different TTL based on key or response
    return key.startsWith('user:') ? 30000 : 5000;
  },
  evictionPolicy: 'LRU',
  capacity: 1000
});
```

#### Non-blocking Mode with Callback

```ts
const remembered = new Remembered({
  ttl: 5000,
  evictionPolicy: 'LRU',
  capacity: 100,
  nonBlocking: true,
  onReused: (key: string) => {
    console.log(`Cache hit for key: ${key}`);
  }
});
```

## Wrapping Functions

Another option is to use the **wrap** method:

```ts
const callback = () => new Promise<number>((resolve) => {
  setTimeout(200, () => resolve(Date.now()));
});
const wrapped = remembered.wrap(callback, () => 'test');

const [r1, r2, r3] = await Promise.all([
  wrapped(),
  wrapped(),
  wrapped(),
]);
```

The wrap method returns a version of your function that receives the exact same arguments, but uses remembered under the hood. The second parameters you inform also receives the same parameters that your first callback receives, but it must return the remembering key.

# Important!

The given ttl is meant to be readonly. So, if you change the ttl value of the provided, it will not take effect on the previous Remembered instances.

# Cache Strategy Details

## LRU (Least Recently Used)
- Best for: Frequently accessed data
- Evicts: Least recently accessed items
- Use case: General purpose caching, user sessions

## MRU (Most Recently Used)  
- Best for: Data that becomes stale quickly
- Evicts: Most recently accessed items
- Use case: Temporary data, rate limiting

## FIFO (First In, First Out)
- Best for: Time-sensitive data
- Evicts: Oldest items regardless of access
- Use case: Logs, time-series data

## Simple
- Best for: Small datasets, development
- Evicts: Never (memory grows indefinitely)
- Use case: Testing, small applications

# Saudade

There is no proper translation for the word *saudade* in English.
Saudade is the feeling that you feel when you miss someone.
It's the emptiness that is left when someone important to you passes away.
This module is a tribute for my dear uncles who died due to complications of COVID-19.
Uncles, you'll always be remembered.

* **✞ 2020-04-01**: *Genivaldo Rodrigues dos Santos*
* **✞ 2020-03-21**: *João Carlos Rodrigues dos Santos*

## License

Licensed under [MIT](https://en.wikipedia.org/wiki/MIT_License).
