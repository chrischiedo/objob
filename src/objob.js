'use strict';

import uniques from 'uniques';
import type from 'type-of';
import contains from 'string-contains';
import merge from 'deepmerge';

let makeShallow = (subject) => {
  let resp = {};

  for(let keyChain in subject){
    let shallow = false;

    for(let keyChain2 in subject){
      if(keyChain !== keyChain2 && keyChain2.indexOf(keyChain) === 0) {
        shallow = true;
      }
    }

    if(!shallow) {
      resp[keyChain] = subject[keyChain];
    }
  }
  return resp;
};

/**
 * Returns an objob object
 *
 * @param {(object|object[])} subject
 * @returns {(object|object[])}
 */
let ob = function (subject) {

  return {
    deselect: function(keys = []){
      let allKeys = ob(ob(subject).flatten()).keys();
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

      return ob(subject).select(keysToKeep);
    },
    expand: function(depth = 1){
      let res;
      subject = makeShallow(subject);

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
        let keyChains =  ob(subject).keys();

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
            res = merge(res, ob(tmp).expand(++depth));
          }
        }
      }
      return res;
      //return ob(res).removeUndefs();
    },
    flatten: function(prefix='', shallow=false, counter = 0){
      let res;

      if(type(subject) === 'array' && counter === 0) {
        res = [];

        for(let i of subject){
          res = res.concat(ob(i).flatten(prefix, shallow, counter++));
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

            if(type(subject[i]) === 'array' && shallow) {
              res = merge(res, ob(subject[i][0]).flatten(tmpPrefix, shallow, counter++));
            } else {
              res = merge(res, ob(subject[i]).flatten(tmpPrefix, shallow, counter++));
            }
          }
        }
      }
      return res;
    },
    keys:function() {
      let keys = [];

      if(type(subject) === 'array') {
        for(let i of subject){
          keys = keys.concat(ob(i).keys());
        }
      } else {
        for(let k in subject) {
          keys.push(k);
        };
      }

      return uniques(keys);
    },
    many: (num = 2) => {
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
    removeUndefs: () => {
      let res;

      if(type(subject) === 'array') {
        res = [];
        for(let key in subject) {
          if(subject[key] === undefined) {
          } else {
            res.push(ob(subject[key]).removeUndefs());
          }
        }
      } else if(type(subject) === 'object') {
        for(let key in subject) {
          if(subject[key] === undefined) {
            delete subject[key];
          } else {
            subject[key] = ob(subject[key]).removeUndefs();
          }
        }

        return subject;
      } else {
        return subject;
      }

      return res;
    },
    select: (keys = []) => {
      let resp;

      if(type(subject) === 'array') {
        resp = [];

        for(let i of subject){
          resp = resp.concat(ob(i).select(keys));
        }
      } else {
        resp = {};

        let flat = ob(subject).flatten();

        for (let actualKey in flat){
          for (let desiredKey of keys){
            if(actualKey === desiredKey) {
              resp[actualKey] = flat[actualKey];
            }
          }
        }
        resp = ob(resp).expand();
      }

      return resp;
    },
    shallow: () => {
      let x = ob(subject).flatten();
      x = makeShallow(x);

      return ob(x).expand();
    },
    values:() => {
      let values = [];

      if(type(subject) === 'array') {
        for(let i of subject){
          values = values.concat(ob(i).values());
        }
      } else {
        for(let k in subject) {
          values.push(subject[k]);
        };
      }

      return uniques(values);
    },
  };
};

if (typeof module !== 'undefined') {
  module.exports = ob;
}
