'use strict';

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var MapSet = require('./map_set');

module.exports = (function () {
  function WS(url) {
    var _this = this;

    _classCallCheck(this, WS);

    this.ws = new WebSocket(url);
    this.handlers = new MapSet();

    this.ws.addEventListener('open', function () {
      return _this.trigger('open');
    });
    this.ws.addEventListener('close', function () {
      return _this.trigger('close');
    });
    this.ws.addEventListener('message', function (e) {
      var _JSON$parse = JSON.parse(e.data);

      var _JSON$parse2 = _slicedToArray(_JSON$parse, 2);

      var type = _JSON$parse2[0];
      var payload = _JSON$parse2[1];

      _this.trigger(type, payload);
    });
  }

  _createClass(WS, [{
    key: 'on',
    value: function on(type, callback) {
      this.handlers.add(type, callback);
    }
  }, {
    key: 'off',
    value: function off(type, callback) {
      this.handlers['delete'](type, callback);
    }
  }, {
    key: 'trigger',
    value: function trigger(type) {
      for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        args[_key - 1] = arguments[_key];
      }

      var handlers = this.handlers.get(type);
      if (handlers != null) {
        handlers.forEach(function (handler) {
          return handler.apply(null, args);
        });
      }
    }
  }, {
    key: 'send',
    value: function send(type, payload) {
      this.ws.send(JSON.stringify([type, payload]));
    }
  }, {
    key: 'close',
    value: function close() {
      this.ws.close();
    }
  }]);

  return WS;
})();