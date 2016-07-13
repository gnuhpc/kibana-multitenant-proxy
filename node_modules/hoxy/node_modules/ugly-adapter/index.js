/*
 * Copyright (c) 2015 by Greg Reimer <gregreimer@gmail.com>
 * MIT License. See mit-license.txt for more info.
 */

'use strict';

var MyPromise = require('any-promise');
var slice = Array.prototype.slice;

/*
 * Calls with two or fewer args are optimized to avoid allocating
 * a new array, and subsequently call the function directly instead
 * of applying an array.
 */

function methodPromify(target, method, arg0, arg1) {
  var chopLength = 2
    , argCount = arguments.length - chopLength;
  if (argCount > 2) {
    var args = slice.call(arguments, chopLength);
    return new MyPromise(function(resolve, reject) {
      args.push(function(err, result) {
        if (err) { reject(err); }
        else { resolve(result); }
      });
      target[method].apply(target, args);
    });
  } else {
    return new MyPromise(function(resolve, reject) {
      var cb = function(err, result) {
        if (err) { reject(err); }
        else { resolve(result); }
      };
      if (argCount === 2) {
        target[method].call(target, arg0, arg1, cb);
      } else if (argCount === 1) {
        target[method].call(target, arg0, cb);
      } else if (argCount === 0) {
        target[method].call(target, cb);
      }
    });
  }
}

function functionPromify(fn, arg0, arg1) {
  var chopLength = 1
    , argCount = arguments.length - chopLength;
  if (argCount > 2) {
    var args = slice.call(arguments, chopLength);
    return new MyPromise(function(resolve, reject) {
      args.push(function(err, result) {
        if (err) { reject(err); }
        else { resolve(result); }
      });
      fn.apply(undefined, args);
    });
  } else {
    return new MyPromise(function(resolve, reject) {
      var cb = function(err, result) {
        if (err) { reject(err); }
        else { resolve(result); }
      };
      if (argCount === 2) {
        fn(arg0, arg1, cb);
      } else if (argCount === 1) {
        fn(arg0, cb);
      } else if (argCount === 0) {
        fn(cb);
      }
    });
  }
}

function partialApplier(o0, o1, o2, o3, o4) {
  var outerLen = arguments.length
    , fn = this
    , partial;
  if (outerLen === 0) { partial = fn; }
  else if (outerLen === 1) { partial = fn.bind(null, o0); }
  else if (outerLen === 2) { partial = fn.bind(null, o0, o1); }
  else if (outerLen === 3) { partial = fn.bind(null, o0, o1, o2); }
  else if (outerLen === 4) { partial = fn.bind(null, o0, o1, o2, o3); }
  else if (outerLen === 5) { partial = fn.bind(null, o0, o1, o2, o3, o4); }
  else {
    var args = slice.call(arguments);
    partial = function() {
      var remainingArgs = slice.call(arguments);
      return fn.apply(null, args.concat(remainingArgs));
    };
  }
  return function(a0, a1, a2, a3, a4) {
    var len = arguments.length;
    if (len === 0) { return partial.call(null); }
    else if (len === 1) { return partial.call(null, a0); }
    else if (len === 2) { return partial.call(null, a0, a1); }
    else if (len === 3) { return partial.call(null, a0, a1, a2); }
    else if (len === 4) { return partial.call(null, a0, a1, a2, a3); }
    else if (len === 5) { return partial.call(null, a0, a1, a2, a3, a4); }
    else {
      var remainingArgs = slice.call(arguments);
      return partial.apply(null, remainingArgs);
    }
  };
}

function promify(lib) {
  var methods = slice.call(arguments);
  methods.shift(); // first arg is the lib itself
  if (methods.length === 0) {
    methods = Object.keys(lib);
  }
  var newLib = {};
  methods.forEach(function(method) {
    var thing = lib[method];
    if (typeof thing === 'function') {
      newLib[method] = functionPromify.part(thing);
    } else {
      newLib[method] = thing;
    }
  });
  return newLib;
}

methodPromify.part = partialApplier.bind(methodPromify);
functionPromify.part = partialApplier.bind(functionPromify);

module.exports = functionPromify;
module.exports.method = methodPromify;
module.exports.promify = promify;
