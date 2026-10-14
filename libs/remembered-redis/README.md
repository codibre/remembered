[![Actions Status](https://github.com/Codibre/remembered-redis/workflows/build/badge.svg)](https://github.com/Codibre/remembered-redis/actions)
[![Actions Status](https://github.com/Codibre/remembered-redis/workflows/test/badge.svg)](https://github.com/Codibre/remembered-redis/actions)
[![Actions Status](https://github.com/Codibre/remembered-redis/workflows/lint/badge.svg)](https://github.com/Codibre/remembered-redis/actions)
[![Test Coverage](https://api.codeclimate.com/v1/badges/f11e39489f6b57ff1e9d/test_coverage)](https://codeclimate.com/github/Codibre/remembered-redis/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/f11e39489f6b57ff1e9d/maintainability)](https://codeclimate.com/github/Codibre/remembered-redis/maintainability)
[![Packages](https://david-dm.org/Codibre/remembered-redis.svg)](https://david-dm.org/Codibre/remembered-redis)
[![npm version](https://badge.fury.io/js/%40remembered%2Fredis.svg)](https://badge.fury.io/js/%40remembered%2Fredis)

A simple semaphore/cache lib using redis, extended from remembered package

# How to Install

```
npm i @remembered/redis
```

# How to use

Create an Remembered instance passing a redis-io instance:

```ts
const remembered = new RememberedRedis({
  ttl: 200, // In milliseconds
  redisTtl: 10000 // In seconds
}, IORedisInstance);
```

Now, call the method you want to use the semaphore using get

```ts
const result = await remembered.get(request.myKey, () => myRequest(request));
```

You can also use the wrap method to create a new version of your function that uses the semaphore under the hood

```ts
const semaphoredMyRequest = remembered.wrap(myRequest, (request) => request.myKey);

const result = await semaphoredMyRequest(request);
```

Notice that the remembering key in the wrap option is defined by the second callback. This function receives the same parameters as the first one.

# Important!

The **ttl** refers to the local ttl, the one that the **remembered** package uses to reuse promises. **redisTtl**, in the other hand, refers to the ttl the cache will have in Redis. This distinction is important as, locally, you have a limited memory.
You can make the local ttl be just some seconds or even 0 (for the promise to be reused just while it is not resolved), while **RedisTtl** can be larger, without affecting memory consumption in your service.

# How to use getSWRStream

When the result you want to remember is a list too large to fit in memory, you can stream it instead. Items are chunked into a Redis **generation hash** (one field per chunk) pointed to by a small meta hash.

```ts
const remembered = new RememberedRedis({
  ttl: 200,
  redisTtl: 10000,
}, IORedisInstance);

for await (const item of remembered.getSWRStream(myKey, () => myLargeDataSource(), {
  chunkSize: 500, // items per Redis hash field (defaults to 500)
  ttl: 600, // freshness window in seconds (defaults to the instance redisTtl)
  compression: true, // compresses each chunk (defaults to the instance setting)
  maxLifetime: 86400, // serving horizon in seconds (defaults to 24h)
  maxRecoveries: 3, // transparent regenerations per read (defaults to 3)
  retireGrace: 600, // seconds an idle superseded generation waits before reclamation (defaults to 10min)
})) {
  // items arrive one at a time; only the current chunk is kept in memory
}
```

The first call generates and caches the stream, yielding items as they are produced. Subsequent calls skip the source and deliver cached chunks in generation order, fetching **one chunk at a time, on demand** — cached reads are memory-friendly too.

## Stale-while-refresh, and surviving cache instability

Cached streams **never hard-expire while consumable**: `ttl` is a *freshness marker* in the stream metadata, not a Redis execution ttl. When a stream goes stale, readers still get the **complete previous snapshot** while a single background task per stream regenerates it and atomically swaps the pointer — readers on the old generation finish undisturbed. `maxLifetime` is the serving horizon (a stream older than that is treated as a miss), and Redis ttls are only crash/orphan sweepers.

If the stream is evicted mid-read (`maxmemory`, for instance), the library **regenerates from the source and resumes at the exact position the consumer stopped**: the iterator keeps receiving items, complete and in order, with no repeats.

`clearCache()` clears streams too, and a refresh that was mid-flight when you cleared will **not** resurrect the stream afterwards: its publish is checked against a short-lived clear tombstone and dropped. The next read is a fresh miss. (SWR here is the stale-while-revalidate semantics of [RFC 5861](https://www.rfc-editor.org/rfc/rfc5861), applied to remembered streams.)

Coordination across processes is **soft**, in the "try, didn't get it? someone is already doing the job" spirit:

- only one revalidation runs at a time — the background refresh takes a try-once redis mutex lease and simply forgets the refresh when the lock is taken (a dead holder's lease frees itself); if your config provides a `semaphore` implementing the optional `tryAcquire(key)`, the soft lock runs through it instead, falling back to the internal redis-semaphore mutex when the method is not implemented;
- a superseded generation is garbage, but a reader may still be consuming it. The generation ttl is renewed on every touch, so **a ttl idle past `retireGrace` means nobody is left on it** — every read that starts with two generations in play is an opportunity to reclaim the old one, instead of waiting for the sweeper horizon.

Both are best-effort by design: a missed lock or failed reclamation degrades to the ttl sweeper, never to corruption.

Trade-offs, accepted by design (eventual consistency):

- while a revalidation runs, old and new generation coexist: peak storage is ~2x the stream (bounded at 2x by the soft lock — concurrent readers never multiply generations). An idle superseded generation is reclaimed around `retireGrace` after the next read, worst case its sweeper horizon;
- a background refresh means a read may serve the previous snapshot for one more full pass;
- each revalidation is a complete source traversal (there is no incremental regeneration): expect one full `callback()` pass per freshness window in steady state, worst case more with eviction-triggered resumptions, capped by maxRecoveries;
- resume after loss is positional: if the source added, removed or reordered items around the breaking point, items added before it may be delivered, and moved items may repeat or be skipped;
- maxRecoveries and maxLifetime cap both loops, so a permanently failing source surfaces as its own error instead of an endless cycle.


# How to use alternative persistence

Sometimes the size of your data is just too big for redis to be a cheap solution, and you need to take some common strategy, like, to save the data in S3 and to use a reference to the saved file in Redis, for ttl control. This package offers a way to apply this strategy seamlessly through the configuration **alternativePersistence**. Here's an example:

First, you need to implement the interface **AlternativePersistence**. The implementation below is a valid one to use with S3
```ts
export class S3Cache implements AlternativePersistence {
  constructor(
    private s3: S3, //AWS S3 object
    private bucketName: string,
    public maxSavingDelay: number,
  ) {}

  async save(key: string, content: string | Buffer): Promise<void> {
    const objectKey = this.getObjectKey(key);

    const params = {
      Body: content,
      Bucket: this.bucketName,
      Key: objectKey,
      ContentType: 'application/octet-stream',
    };

    await this.s3.putObject(params).promise();
  }

  async get(key: string): Promise<string | Buffer | undefined> {
    try {
      const params = {
        Bucket: this.bucketName,
        Key: this.getObjectKey(key),
      };

      const { Body } = await this.s3.getObject(params).promise();

      return Body as string | Buffer | undefined;
    } catch {
      return undefined;
    }
  }

  private getObjectKey(key: string): string {
    return `my-cache/${key}.bin`;
  }
}
```

Then, you can use it with **remembered-redis**:
```ts
const remembered = new RememberedRedis(
  {
    ttl: 0,
    redisTtl: 3600,
    redisPrefix: 's3-cache',
    alternativePersistence: new S3Cache(s3, 'my-bucket', 3),
  },
  redisInstance,
);
```

That's it! Now S3 will get the heavy data while Redis control semaphore, and ttl! But there's more to it: **maxSavingDelay** is part of the **AlternativePersistence** interface, and it determines how much time **remembered-redis** will wait to save the new data and to release the semaphore.
But why wait? Because more data can be gathered from another calls and all that data can be saved in the same S3 file.
The data is also saved compressed and it will benefit from a larger content, and the number of objects sent to S3 will be much lesser than the number of results you have. For example, if you have 100 calls in 3 seconds, you'll only send 1 file to S3, avoiding 99 calls! This is important because S3 can charge you very high if your number of api calls is big, and with this strategy you can decrease your cost by almost 50%!

You can also use even a redis AlternativePersistence implementation:

```ts
export class RedisCache implements AlternativePersistence {
  constructor(
    private redis: Redis,
    private bucketName: string,
    public maxSavingDelay: number,
  ) {}

  async save(key: string, content: string | Buffer, ttl: number): Promise<void> {
    await this.redis.setex(key, ttl, content);
  }

  async get(key: string): Promise<string | Buffer | undefined> {
    return this.redis.getBuffer(key);
  }
}
```

This may not seem reasonable, but, as you join many results into one can when maxSavingDelay > 0, you can favor the compression with this, and save a lot of memory in your instance.

There is also the option to dynamically decide whether to use alternative persistence or Redis as the storage. Simply define the **shouldUseAlternativePersistence** function, and whenever it returns false, the alternative persistence is ignored. A common use case is when your application manages data with different lifetime: Redis can handle data with short expiration times, while the alternative persistence stores longer-lived data, optimizing storage costs.

## License

Licensed under [MIT](https://en.wikipedia.org/wiki/MIT_License).
