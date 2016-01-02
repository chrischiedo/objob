'use strict';

import uniques from 'uniques';
import type from 'type-of';
import contains from 'string-contains';
import merge from 'deepmerge';
import { makeFlattenedShallow } from './functions';

/**
 * @namespace
 * @version 2.0.0
 * */
let ob = {
  /**
   * Performs a deep clone of an object
   *
   * @example
   * let x = {
   *  a: 1,
   *  b: 2,
   *  c: 3,
   * }
   *
   * y = ob.cloneDeep(x)
   * y === x
   * // → false
   *
   * @param {object} subject The object to clone.
   * @returns {object} The cloned object
   */
  cloneDeep: function(subject){
    return ob.expand(ob.flatten(subject));
  },
  /**
   * Returns an object without the given keys.
   * @example <caption>Basic usage.</caption>
   * let x = {
   *  a: 1,
   *  b: 2,
   *  c: 3,
   * }
   *
   * ob.deselect(x, ['a','b']);
   * // → {c: 3}
   * @example <caption>Advanced usage.</caption>
   * let x = {
   *  c: 3,
   *  d: {e: 4, f: [5,6]},
   *  g: [7, 8]
   * }
   *
   * ob.deselect(x, ['d.e','d.f[].0','g[].1']);
   * // → {c: 3, d: {f:[6]}, g:[7]}
   *
   * @param {object} subject The object to perform the deselect operation on.
   * @param {string[]} keys The keys of the object or nested object that you would like to deselect.
   * @returns {object} The object without the deselected keys
   */
  deselect: function(subject, keys = []){
    let allKeys = ob.keys(ob.flatten(subject));
    let keysToKeep = [];

    for( let subjectKey of allKeys ) {
      let keepKey = true;

      for( let keyToRemove of keys ){
        if(subjectKey === keyToRemove){
          keepKey = false;
        }
      }

      if(keepKey){
        keysToKeep.push(subjectKey);
      }
    }

    return ob.select(subject, keysToKeep);
  },
  /**
   * Takes a flattened object  and expands it back to a full object.
   *
   * @example
   * let x = {
   *  'a.b.c': 1,
   *  'a.b.d': [2,3]
   *  'a.b.d[].0': 2,
   *  'a.b.d[].1': 3',
   * }
   *
   * ob.expand(x)
   * // → {a: {b: {c: 1, d: [2,3]}}}
   *
   * @param {object} subject The object to expand
   * @returns {object} The expanded object.
   */
  expand: function(subject, depth = 1){
    let res;
    subject = makeFlattenedShallow(subject);

    // Determine if an array is represented by the flattened object
    let rootObjectPresent = true;
    if(depth === 1) {
      rootObjectPresent = false;
      for(let key in subject) {
        let rootArrayPresent = key.match(/^\d/ig);

        rootObjectPresent = (rootObjectPresent || !rootArrayPresent);
      }
    }

    if(rootObjectPresent === false && depth === 1) {
      res = [];
      for(let key in subject) {
        res.push(subject[key]);
      }
    } else {
      let keyChains =  ob.keys(subject);

      // When the object is just {'example.example': y}
      // One key and one value
      if(keyChains.length === 1) {
        let tmp = {};
        let keyChain = keyChains[0]; // something like 'first.another.another'
        let value = subject[keyChain];
        let count;

        res = tmp; // Poining to tmp so that we have a place holder before nesting
        count = 1;
        let keys = keyChain.split('.');
        for(let key of keys) {
          if(count === keys.length) {
            tmp[key] = value;
          } else {
            let isArray = contains(key, '[]');
            if(isArray) {
              key = key.replace('[]','');
              tmp[key] = [];
            } else {
              tmp[key] = {};
            }

            tmp = tmp[key];
          }
          count++;
        }

      } else {
        // If multiple keychains in the object, simplify our logic a bit
        res = {};
        for(let i in subject) {
          let tmp = {};
          tmp[i] = subject[i];
          res = merge(res, ob.expand(tmp, ++depth));
        }
      }
    }
    return res;
  },
  /**
   * Takes an object and return a flattened representation of that object that has one level of depth. This allows you to do complex operations on your object while it's in a format that's easier to work with.
   *
   * @example
   * let x = {
   *   a:{
   *     b:{
   *       c: 1,
   *       d: [2,3]
   *     }
   *  }
   * }
   *
   * ob.flatten(x)
   * // → {
   *  'a.b.c': 1,
   *  'a.b.d': [2,3]
   *  'a.b.d[].0': 2,
   *  'a.b.d[].1': 3',
   * }
   *
   * @param {object} subject The object to perform the flattening on
   * @returns {object} The flat representation of the object
   */
  flatten: function(subject, prefix='', depth = 1){
    let res;

    if(type(subject) === 'array' && depth === 1) {
      res = [];

      for(let i of subject){
        res = res.concat(ob.flatten(i, prefix, ++depth));
      }

      return res;
    } else {
      res = {};

      if(type(subject) === 'object' || type(subject) === 'array'){

        for(let i in subject) {
          let tmpPrefix;
          if(prefix === '') {
            tmpPrefix = `${i}`;
          } else {
            tmpPrefix = `${prefix}.${i}`;
          }

          if(type(subject[i]) === 'array') {
            tmpPrefix = tmpPrefix + '[]';
          }

          res[tmpPrefix] = subject[i];

          res = merge(res, ob.flatten(subject[i],tmpPrefix, ++depth));
        }
      }
    }
    return res;
  },
  /**
   * Return all keys for an object recursively, including in arrays.
   *
   * @example
   * let x = {
   *   a: 1,
   *   b: 2,
   *   c: 3
   * }
   *
   * ob.keys(x)
   * // → ['a','b','c']
   *
   * @example
   * let x = [{ a: 1, b: 2, c: 3}, {d: 1}]
   *
   * ob.keys(x)
   * // → ['a','b','c', 'd']
   *
   * @param {object} subject The object whose keys you wish to retrieve.
   * @returns {string[]} The keys
   */
  keys:function(subject) {
    let keys = [];

    if(type(subject) === 'array') {
      for(let i of subject){
        keys = keys.concat(ob.keys(i));
      }

      return uniques(keys);
    } else if(type(subject) === 'object') {
      for(let k in subject) {
        keys = keys.concat(ob.keys(k));
      };
      return uniques(keys);
    } else {
      keys.push(subject);
      return uniques(keys);
    }
  },
  /**
   * Returns many of the object. If an array is passed, it will just return
   * the given array.
   *
   * @example
   * let x = {
   *   a: 1,
   *   b: 2,
   *   c: 3
   * }
   *
   * ob.many(x)
   * // → [{a:1,b:2,c:3},{a:1,b:2,c:3}]
   *
   *
   * @param {object} subject The object you would like many of
   * @param {integer} num the number of desired objects
   * @returns {object[]} An array with n copies of your object.
   */
  many: (subject, num = 2) => {
    let arr = [];

    if(type(subject) === 'array') {
      return subject;
    } else {
      for(let i = 0; i < num; i++){
        arr.push(subject);
      }
    }

    return arr;
  },
  /**
   * Removes all keys with undefined values from an object.
   *
   * @example
   * let x = {
   *   a: undefined,
   *   b: {
   *     c: undefined,
   *     d: 2,
   *   },
   *   e: [undefined, 1, 2]
   * }
   *
   * ob.removeUndefs(x)
   * // → {
   *   b: {
   *     d: 2,
   *   },
   *   e: [1, 2]
   * }
   *
   *
   * @param {object} subject The object you would like to remove undefined values from.
   * @returns {object} The object without any undefined values
   */
  removeUndefs: (subject) => {
    // Make sure we don't mutate the original object
    subject = ob.cloneDeep(subject);

    let res;

    if(type(subject) === 'array') {
      res = [];
      for(let key in subject) {
        if(subject[key] === undefined) {
        } else {
          res.push(ob.removeUndefs(subject[key]));
        }
      }
    } else if(type(subject) === 'object') {
      for(let key in subject) {
        if(subject[key] === undefined) {
          delete subject[key];
        } else {
          subject[key] = ob.removeUndefs(subject[key]);
        }
      }

      return subject;
    } else {
      return subject;
    }

    return res;
  },
  /**
   * Returns an object only with the given keys.
   *
   * @example <caption>Basic usage.</caption>
   * let x = {
   *  a: 1,
   *  b: 2,
   *  c: 3,
   * }
   *
   * ob.select(x, ['a','b']);
   * // → {a: 1, b: 2}
   *
   * @example <caption>Advanced usage.</caption>
   * let x = {
   *  c: 3,
   *  d: {e: 4, f: [5,6]},
   *  g: [7, 8]
   * }
   *
   * ob.select(x, ['d.e','d.f[].0','g[].1']);
   * // → {d: {e: 4, f: [5]}, g: [8]}
   *
   * @param {object} subject The object to perform the select operation on
   * @param {string[]} keys The keys you would like to select
   * @returns {object} The object only with the selected keys.
   */
  select: (subject, keys = []) => {
    let resp;

    if(type(subject) === 'array') {
      resp = [];

      for(let i of subject){
        resp = resp.concat(ob.select(i, keys));
      }
    } else {
      resp = {};

      let flat = ob.flatten(subject);

      for (let actualKey in flat){
        for (let desiredKey of keys){
          if(actualKey === desiredKey) {
            resp[actualKey] = flat[actualKey];
          }
        }
      }
      resp = ob.expand(resp);
    }

    return resp;
  },
  /**
   * Returns all values for a given object recursively.
   *
   * @example
   * let x = {
   *   a: 1,
   *   b: 2,
   *   c: 3
   * }
   *
   * ob.values(x)
   * // → [1, 2, 3]
   *
   * @example
   * let x = {
   *   a: 1,
   *   b: 2,
   *   c: 3,
   *   d: [4]
   * }
   *
   * ob.values(x)
   * // → [1, 2, 3, 4]
   *
   * @param {object} subject The object to get the values of
   * @returns {any[]}
   */
  values:(subject) => {
    let values = [];

    if(type(subject) === 'array') {
      for(let i of subject){
        values = values.concat(ob.values(i));
      }

      return uniques(values);
    } else if(type(subject) === 'object') {
      for(let k in subject) {
        values = values.concat(ob.values(subject[k]));
      };
      return uniques(values);
    } else {
      values.push(subject);
      return uniques(values);
    }
  },
};

if (typeof module !== 'undefined') {
  module.exports = ob;
}
