# [1.2.0](https://github.com/codibre/remembered-s3-alternative-persistence/compare/v1.1.3...v1.2.0) (2024-10-07)


### Features

* implement shouldUseAlternativePersistence function from AlternativePersistence interface ([7ec3b8d](https://github.com/codibre/remembered-s3-alternative-persistence/commit/7ec3b8d3c503231719ea96e9f56f0fae550d5258))

## [1.1.3](https://github.com/codibre/remembered-s3-alternative-persistence/compare/v1.1.2...v1.1.3) (2023-06-17)


### Bug Fixes

* implementing firstCheck support ([92d613e](https://github.com/codibre/remembered-s3-alternative-persistence/commit/92d613ed05c0503b5cf4a3e09e5d12d4acbeec39))

## [1.1.2](https://github.com/codibre/remembered-s3-alternative-persistence/compare/v1.1.1...v1.1.2) (2023-06-17)


### Bug Fixes

* fixing persistenceType for s3 fetching success ([38e7a4c](https://github.com/codibre/remembered-s3-alternative-persistence/commit/38e7a4c2bf95a59beefbfc7c5952df7375769f14))

## [1.1.1](https://github.com/codibre/remembered-s3-alternative-persistence/compare/v1.1.0...v1.1.1) (2023-06-17)


### Bug Fixes

* emitting saving event only when persisted ([d28c9c8](https://github.com/codibre/remembered-s3-alternative-persistence/commit/d28c9c87f687a27fc112cce683a06ed358df6510))

# [1.1.0](https://github.com/codibre/remembered-s3-alternative-persistence/compare/v1.0.2...v1.1.0) (2023-06-17)


### Features

* adding success events ([9a85290](https://github.com/codibre/remembered-s3-alternative-persistence/commit/9a85290e9177fe1e0d49fffb990eeb476f508e65))

## [1.0.2](https://github.com/codibre/remembered-s3-alternative-persistence/compare/v1.0.1...v1.0.2) (2023-06-16)


### Bug Fixes

* return buffer from s3 ([51a86da](https://github.com/codibre/remembered-s3-alternative-persistence/commit/51a86da260c36901af406d5eecfc163edda2ef50))

## [1.0.1](https://github.com/codibre/remembered-s3-alternative-persistence/compare/v1.0.0...v1.0.1) (2023-06-16)


### Bug Fixes

* fixing cache fetching from s3 ([c7e3bed](https://github.com/codibre/remembered-s3-alternative-persistence/commit/c7e3bedf0df5f8747bbcaab90afe7327a94c7353))

# [1.0.0](https://github.com/codibre/remembered-s3-alternative-persistence/compare/v0.0.3...v1.0.0) (2023-06-15)


### Bug Fixes

* accepting all ioredis versions ([4030a1a](https://github.com/codibre/remembered-s3-alternative-persistence/commit/4030a1a989fe56775d1446e770f12e17017bc88b))


### Features

* adding suport to maxResultsPerSave ([034d902](https://github.com/codibre/remembered-s3-alternative-persistence/commit/034d902151b8ad1cea042af2d22f7a2cf162c9ea))
* updating to aws-sdk v3 ([6eb2b22](https://github.com/codibre/remembered-s3-alternative-persistence/commit/6eb2b2299677f26f061684b27fe56c8610aed2ff))
* updating to aws-sdk v3 ([98a207a](https://github.com/codibre/remembered-s3-alternative-persistence/commit/98a207ac873f18806d4ca686d0f8ba63cd90b693))


### BREAKING CHANGES

* aws sdk v2 no longer compatible
* aws-sdk v2 will not be supported anymore
* major bump

## 0.0.3
* efaf624 fixing lint
* c878c94 fix: updating package name
## v0.0.2
* df3de87 0.0.2
* bb78ae2 docs: updating readme
* 4c636d4 feat: first version
* 0719c46 Initial commit
