# Universal Callback => Promise Adapter

With [Koa](http://koajs.com/) and [ES7 async functions](https://jakearchibald.com/2014/es7-async-functions/) gaining prominence, the JavaScript world is poised to transition to promises.
That means we need a sane way to *promisify* callback-based APIs.
Rather than importing lots of different promisification wrappers for each API, this lib provides a single way to promisify every API.

## Install

```bash
npm install ugly-adapter
```

## Use

```js
import adapt from 'ugly-adapter';
...
var data = await adapt(fs.readFile, './data.txt', 'utf8');
```

This lib also exposes methods to make partial application easier.
Which is useful if you want to re-use an adapted version of a function.

```js
var read = adapt.part(fs.readFile);
var data1 = await read('./data1', 'utf8');
var data2 = await read('./data2', 'utf8');
```

# API

## Call a bare function: `adapt()`

Useful when you don't think a function cares about `this`.

```js
// signature
var promise = adapt(<function>, ...args)

// fs.readFile(path, enc, callback) example
adapt(fs.readFile, './data.txt', 'utf8').then(...)
```

## Call a method on an object: `adapt.method()`

Useful when you think a function definitely cares about `this`.

```js
// signature
var promise = adapt.method(<object>, <string>, ...args)

// user.authenticate(opts, callback) example
var user = new User()
adapt.method(user, 'authenticate', {
  userName: userName,
  password: password
}).then(...)
```

## Partially apply a bare function: `adapt.part()`

```js
// signature
var fn = adapt.part(<function>, ...args)

// example
var stat = adapt.part(fs.stat, './data.txt', 'utf8')
stat().then(...)
```

## Partially apply a method on an object: `adapt.method.part()`

```js
// signature
var fn = adapt.method.part(<object>, <string>, ...args)

// example
var user = new User()
var authenticate = adapt.method.part(user, 'authenticate')
authenticate({
  userName: userName,
  password: password
}).then(...)
```

A note about partial application.
You can basically move the `)(` around willy-nilly.

```js
// these behave identically
var promise = adapt.part(a,b,c)()
var promise = adapt.part(a,b)(c)
var promise = adapt.part(a)(b,c)
var promise = adapt.part()(a,b,c)
```

## Promify a library: `adapt.promify(lib)`

You can promisify entire library modules, such as `fs`.
It will return an object with all the same properties and functions.
The functions have the same signature—sans callback—and return promises.

```js
var adapt = require('ugly-adapter')
  , callbackFs = require('fs')
  , fs = adapt.promify(callbackFs);

fs.stat(...).then(...);
```

The above promifies every function in the `fs` module.
If you only want to promify a subset of functions, declare them in a whitelist.

```js
var adapt = require('ugly-adapter')
  , callbackFs = require('fs')
  , fs = adapt.promify(callbackFs, 'stat', 'readFile');

fs.stat(...).then(...);
fs.readFile(...).then(...);
fs.link(...).then(...); // error, wasn't in the whitelist!
```

# Async/Await Example

Now that we can convert callbacks to promises, we can write async functions everywhere.

```js
async function jsonReadFile(path, encoding) {
  let data = await adapt(fs.readFile, encoding);
  data = JSON.parse(data);
  return data;
}
```

# Any Promise

Ugly adapter uses [any-promise](https://github.com/kevinbeaty/any-promise) promises. This is something you can safely ignore and everything works normally. However, if you want to polyfill/replace your environment's Promise for whatever reason, this allows you swap in whatever conforming Promise you want and this library will use it.
