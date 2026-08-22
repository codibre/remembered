[![Actions Status](https://github.com/Codibre/remembered-s3-alternative-persistence/workflows/build/badge.svg)](https://github.com/Codibre/remembered-s3-alternative-persistence/actions)
[![Actions Status](https://github.com/Codibre/remembered-s3-alternative-persistence/workflows/test/badge.svg)](https://github.com/Codibre/remembered-s3-alternative-persistence/actions)
[![Actions Status](https://github.com/Codibre/remembered-s3-alternative-persistence/workflows/lint/badge.svg)](https://github.com/Codibre/remembered-s3-alternative-persistence/actions)
[![Test Coverage](https://api.codeclimate.com/v1/badges/65e41e3018643f28168e/test_coverage)](https://codeclimate.com/github/Codibre/remembered-s3-alternative-persistence/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/65e41e3018643f28168e/maintainability)](https://codeclimate.com/github/Codibre/remembered-s3-alternative-persistence/maintainability)
[![Packages](https://david-dm.org/Codibre/remembered-s3-alternative-persistence.svg)](https://david-dm.org/Codibre/remembered-s3-alternative-persistence)
[![npm version](https://badge.fury.io/js/%40codibre%2Fremembered-s3-alternative-persistence.svg)](https://badge.fury.io/js/%40codibre%2Fremembered-s3-alternative-persistence)

S3 alternative persistence implementation for remembered redis

## How to Install

```
npm i @remembered/s3-alternative-persistence
```

## How to use

When creating a RememberedRedis instance, just inform the alternative persistence, as below

```ts
const remembered = new RememberedRedis(
  {
    ttl: 0,
    redisTtl: 3600,
    redisPrefix: 's3-cache',
    alternativePersistence: new S3Cache({
      s3, // s3 instance
      redis, // redis instance. optional
      bucketName: 'my-bucket',
      maxSavingDelay: 3,
      transientTtl: 300
    ),
  },
  redisInstance,
);
```

**maxSavingDelay** is meant to indicate to RememberedRedis how much it need to wait until the cache is save. The longer it waits, more values are inserted in the same S3 file, saving some requests, but bigger is the file and the memory consumption to deal with it, so measure that one carefully for your need.
**transientTll** defines the maximum ttl to keep the same file content on redis. This is useful if you have some spare memory on your redis instance and wants to use it to make less GET requests on S3, saving some money with it. Also measure that for your need, and if you want to avoid using it at all, don't inform a redis instance, don't inform this property or inform it as 0.

You can also listen for error events: saveError and fetchingError. This will be emitted when either the communication with redis or S3 fails

## License

Licensed under [MIT](https://en.wikipedia.org/wiki/MIT_License).
