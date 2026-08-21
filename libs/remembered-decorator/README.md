[![Actions Status](https://github.com/Codibre/remembered-decorator/workflows/build/badge.svg)](https://github.com/Codibre/remembered-decorator/actions)
[![Actions Status](https://github.com/Codibre/remembered-decorator/workflows/test/badge.svg)](https://github.com/Codibre/remembered-decorator/actions)
[![Actions Status](https://github.com/Codibre/remembered-decorator/workflows/lint/badge.svg)](https://github.com/Codibre/remembered-decorator/actions)
[![Test Coverage](https://api.codeclimate.com/v1/badges/36636f257105eb8a9d93/test_coverage)](https://codeclimate.com/github/Codibre/remembered-decorator/test_coverage)
[![Maintainability](https://api.codeclimate.com/v1/badges/36636f257105eb8a9d93/maintainability)](https://codeclimate.com/github/Codibre/remembered-decorator/maintainability)
[![Packages](https://david-dm.org/Codibre/remembered-decorator.svg)](https://david-dm.org/Codibre/remembered-decorator)
[![npm version](https://badge.fury.io/js/%40remembered%2Fdecorator.svg)](https://badge.fury.io/js/%40remembered%2Fremembered-decorator)

Decorator for easy **[remembered](https://www.npmjs.com/package/remembered)** appliance.

## How to Install

```
npm i @remembered/decorator remembered
```

## How to use it
Apply the decorator **UseRemembered** to every method you want:
```ts
class MyClass {
  @UseRemembered((a: SomeType) => a.id)
  async myMethod(a: SomeType) {
    return processResult(a);
  }
}
```

Notice that the decorator needs a callback to define how the remembering key will be generated. this callback will be called with the exactly same parameters **myMethod** is called.
The decorator itself will not make any difference but, in some initialization part of your code, after all your classes are already loaded (which is trivial if you're using the default class declaration and import pattern), just call **setupRemembered**:

```ts
setupRemembered((class) => injector.get(Remembered));
```

Look that **setupRemembered** receives a callback that must return a **Remembered** instance. This callback receives a reference to the Class object where **Remembered** will be applied. This way, you have control on how you want to instantiate it, or if you want to use some extension like **[@remembered/redis](https://www.npmjs.com/package/@remembered/redis)**.
There is also a helper function that guarantees to you that only one instance per decorated class will be returned. To use it, you can do like this:

```ts
setupRemembered(getRememberedByClassFactory((class) => injector.get(Remembered)));
```


## License

Licensed under [MIT](https://en.wikipedia.org/wiki/MIT_License).
