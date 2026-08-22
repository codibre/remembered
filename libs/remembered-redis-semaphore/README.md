[![Actions Status](https://github.com/Codibre/remembered-redis-semaphore/workflows/build/badge.svg)](https://github.com/Codibre/remembered-redis-semaphore/actions)
[![Actions Status](https://github.com/Codibre/remembered-redis-semaphore/workflows/test/badge.svg)](https://github.com/Codibre/remembered-redis-semaphore/actions)
[![Actions Status](https://github.com/Codibre/remembered-redis-semaphore/workflows/lint/badge.svg)](https://github.com/Codibre/remembered-redis-semaphore/actions)
[![Test Coverage](https://api.codeclimate.com/v1/badges/3b88781ef0ec77d6fae0/test_coverage)](https://codeclimate.com/github/Codibre/remembered-redis-semaphore/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/3b88781ef0ec77d6fae0/maintainability)](https://codeclimate.com/github/Codibre/remembered-redis-semaphore/maintainability)
[![Packages](https://david-dm.org/Codibre/remembered-redis-semaphore.svg)](https://david-dm.org/Codibre/remembered-redis-semaphore)
[![npm version](https://badge.fury.io/js/%40remembered-redis%2Fredis-semaphore.svg)](https://badge.fury.io/js/%40remembered-redis%2Fredis-semaphore)

Remembered redis semaphore implementation, to be used with [@remembered/redis](https://www.npmjs.com/package/@remembered/redis)
This packages uses [redis-semaphore](https://www.npmjs.com/package/redis-semaphore) under the hood.
## How to Install

```
npm i @remembered/redis-semaphore
```

## How to use it

When instantiating **RememberedRedis**, just inform an instance os **RememberedRedisSemaphore**

```ts
const semaphore = new RememberedRedisSemaphore(IORedisInstanceForSemaphore, {

})

const remembered = new RememberedRedis({
  ttl: 200, // In milliseconds
  redisTtl: 10000 // In seconds
  semaphore,
}, IORedisInstance);
```

Although this package is meant to use as a plugin for RememberedRedis, you can also use it as a completely standalone one.

It offers three different approaches to use semaphores.

The first and most basic one is through acquiring and releasing it manually, like this:

```ts
  const release = await semaphore.acquire('my semaphore id');
  try {
    // Put here anything you want to do
  } finally {
    await release();
  }
```

It's always recommended to put the release call into a finally statement, to guarantee it was released.
You can also use the callback approach, where it is executed within the semaphore, like this:

```ts
const result = await semaphore.run('my semaphroe id', () => {
  // Put here anything you want to do
});
```

result here will be the result of the informed callback.
Finally, the last possible approach is to wrap a function, making a version of it that do the same job, but within a semaphore. Like this:

```ts
const wrapped = semaphore.wrap((arg1, arg2, arg3) => {
  // Put here anything you want to do
}, (arg1, arg2, arg3) => {
  // Put here the algorithm to select the key based on the callback parameters
});


const result = await wrapped(value1, value2, value3);
```

See that, the first callback is the one that will be executed within a semaphore, while the second one
must return the key to be used in the semaphore. The second callback will received the exact same
parameters of the first one. You can use wrapped to replace instance methods for versions wrapped in a semaphore, or to
create functions that will be passed as a callback to other ones, that will use a semaphore.


## License

Licensed under [MIT](https://en.wikipedia.org/wiki/MIT_License).
