"use strict";

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

module.exports = (function () {
  function MapMap() {
    _classCallCheck(this, MapMap);

    this.map = new Map();
  }

  _createClass(MapMap, [{
    key: "get",
    value: function get(key1, key2) {
      if (arguments.length === 1) {
        return this.map.get(key1);
      } else {
        var map = this.map.get(key1);
        return map && map.get(key2);
      }
    }
  }, {
    key: "set",
    value: function set(key1, key2, value) {
      var map = this.map.get(key1);
      if (map == null) {
        map = new Map();
        this.map.set(key1, map);
      }

      return map.set(key2, value);
    }
  }, {
    key: "delete",
    value: function _delete(key1, key2) {
      if (arguments.length === 1) {
        return this.map["delete"](key1);
      } else {
        var map = this.map.get(key1);
        if (map == null) {
          return false;
        } else {
          var result = map["delete"](key2);
          if (map.size === 0) this.map["delete"](key1);
          return result;
        }
      }
    }
  }, {
    key: "has",
    value: function has(key1, key2) {
      if (arguments.length === 1) {
        return this.map.has(key1);
      } else {
        var map = this.map.get(key1);
        return !!map && map.has(key2);
      }
    }
  }]);

  return MapMap;
})();