"use strict";

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

module.exports = (function () {
  function MapSet() {
    _classCallCheck(this, MapSet);

    this.map = new Map();
  }

  _createClass(MapSet, [{
    key: "get",
    value: function get(key) {
      return this.map.get(key);
    }
  }, {
    key: "add",
    value: function add(key, value) {
      var set = this.map.get(key);
      if (set == null) {
        set = new Set();
        this.map.set(key, set);
      }

      return set.add(value);
    }
  }, {
    key: "delete",
    value: function _delete(key, value) {
      if (arguments.length === 1) {
        return this.map["delete"](key);
      } else {
        var set = this.map.get(key);
        if (set == null) {
          return false;
        } else {
          var result = set["delete"](value);
          if (set.size === 0) this.map["delete"](key);
          return result;
        }
      }
    }
  }, {
    key: "has",
    value: function has(key, value) {
      if (arguments.length === 1) {
        return this.map.has(key);
      } else {
        var set = this.map.get(key);
        return !!set && set.has(value);
      }
    }
  }]);

  return MapSet;
})();