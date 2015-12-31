'use strict';

import uniques from 'uniques';

let type = function(x) {
  if( Object.prototype.toString.call(x) === '[object Array]' ) {
    return 'array';
  } else if(typeof x === 'object') {
    return 'object';
  } else {
    return typeof x;
  }
};

let getNestedObject = function(ob, key) {
  let keys = key.split('.');
  let newOb = {};

  if(keys.length > 1) {
    // Get the key deselect the fist word separated by a period
    let newKey = key.replace(/^(\w|\di|_|$)*./g, '');
    newOb[keys[0]] = getNestedObject(ob[keys[0]], newKey);

  } else {
    newOb[key] = ob[key];
  }

  return newOb;
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
      let allKeys = this.keys(subject);
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

      return this.select(keysToKeep);
    },
    expand: function(){
      let res = {};

      // Get the empty object ready for the data
      for(let keyChain in subject){
        let subkeys = keyChain.split('.');
        let tmp = {};
        let obj = tmp;

        let count = 1;
        for(let subkey of subkeys) {
          // Set the value if the end of the keys
          if(count === subkeys.length) {
            tmp[subkey.replace(/\[\]/g, '')] = subject[keyChain];
          } else {
            // If array create the array, else create the object
            if(subkey.indexOf('[]') !== -1){
              subkey = subkey.replace(/\[\]/g, '');
              tmp[subkey] = [];
            } else {
              tmp[subkey] = {};
            }
            tmp = tmp[subkey];
            count++;
          }
        }
        res = {...obj, ...res};
      }
      return res;
    },
    flatten: function(prefix='', shallow=false){
      let res = {};

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
            res = {...res, ...ob(subject[i][0]).flatten(tmpPrefix, shallow)};
          } else {
            res = {...res, ...ob(subject[i]).flatten(tmpPrefix, shallow)};
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
    select: (keys = []) => {
      let resp;

      if(type(subject) === 'array') {
        resp = [];

        for(let i of subject){
          resp = resp.concat(ob(i).select(keys));
        }
      } else {
        resp = {};

        for (let key of keys) {
          if(key.split('.').length > 1) {
            let searchKey = key.replace(/^(\w|\di|_|$)*./g, '');
            let currentKey = key.replace('.'+searchKey, '');
            resp[currentKey] = getNestedObject(subject[currentKey], searchKey);
          } else {
            resp[key] = subject[key];
          }
        }
      }

      return resp;
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
