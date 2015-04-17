'use strict';

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

//default event types are 'open', 'close', 'join', 'leave', and 'peer'

var WS = require('./ws');
var MapMap = require('./map_map');
var MapSet = require('./map_set');

var RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
var RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription;
var RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate;

var log = function log(message) {
  if (PeerGroup.log) console.log(message);
};

// we will set configuration and events on the prototype after creating the
// PeerGroup class

var configuration = {
  iceServers: [{ url: 'stun:stun.l.google.com:19302' }]
};

// use symbols for event types to prevent the possibility that they could
// clash with message types sent by peers

var events = {
  open: Symbol(),
  close: Symbol(),
  start: Symbol(),
  join: Symbol(),
  peer: Symbol()
};

var PeerGroup = (function () {
  function PeerGroup(url) {
    var _this = this;

    _classCallCheck(this, PeerGroup);

    this.ws = new WS(url);
    this.groups = new Set();
    this.connections = new MapMap();
    this.channels = new MapMap();
    this.handlers = new MapSet();
    this.open = false;
    this.id = null;

    var addDataChannel = function addDataChannel(group, id, dataChannel) {
      _this.channels.set(group, id, dataChannel);

      dataChannel.addEventListener('close', function () {
        return _this.channels['delete'](group, id);
      });

      dataChannel.addEventListener('message', function (e) {
        var _JSON$parse = JSON.parse(e.data);

        var _JSON$parse2 = _slicedToArray(_JSON$parse, 2);

        var type = _JSON$parse2[0];
        var payload = _JSON$parse2[1];

        _this.trigger(type, group, id, payload);
      });
    };

    var addPeerConnection = function addPeerConnection(group, id, connection) {
      _this.connections.set(group, id, connection);

      connection.addEventListener('signalingstatechange', function (e) {
        if (connection.signalingState === 'closed') {
          _this.connections['delete'](group, id);
        }
      });
    };

    this.ws.on('open', function () {
      log('ws opened');
      _this.open = true;
      _this.trigger(_this.events.open, _this);
    });

    this.ws.on('close', function () {
      log('ws closed');
      _this.open = false;
      _this.trigger(_this.events.close, _this);
    });

    this.ready = new Promise(function (resolve) {
      _this.ws.on('start', function (id) {
        log('ws started');
        resolve(id);
        _this.id = id;
        _this.trigger(_this.events.start, _this);
      });
    });

    this.ws.on('request offer', function (_ref) {
      var group = _ref.group;
      var from = _ref.from;

      log('recieved request for offer');
      if (!_this.groups.has(group)) return;

      var connection = new RTCPeerConnection(_this.configuration);
      var dataChannel = connection.createDataChannel('#{group}:#{from}');

      dataChannel.addEventListener('open', function () {
        log('data channel opened to peer');
        _this.trigger(_this.events.peer, group, from);
      });

      connection.addEventListener('icecandidate', function (e) {
        if (e.candidate != null) {
          _this.ws.send('candidate', {
            group: group,
            to: from,
            candidate: e.candidate
          });
        }
      });

      connection.createOffer(function (localDescription) {
        connection.setLocalDescription(localDescription, function () {
          _this.ws.send('offer', {
            group: group,
            to: from,
            sdp: localDescription.sdp
          });
        });
      });

      addDataChannel(group, from, dataChannel);
      addPeerConnection(group, from, connection);
    });

    this.ws.on('offer', function (_ref2) {
      var group = _ref2.group;
      var from = _ref2.from;
      var sdp = _ref2.sdp;

      log('recieved offer');
      if (!_this.groups.has(group)) return;

      var connection = new RTCPeerConnection(_this.configuration);

      connection.addEventListener('datachannel', function (e) {
        log('data channel opened by peer');
        addDataChannel(group, from, e.channel);
        _this.trigger(_this.events.peer, group, from);
      });

      connection.addEventListener('icecandidate', function (e) {
        if (e.candidate != null) {
          _this.ws.send('candidate', {
            group: group,
            to: from,
            candidate: e.candidate
          });
        }
      });

      var remoteDescription = new RTCSessionDescription({
        sdp: sdp,
        type: 'offer'
      });
      connection.setRemoteDescription(remoteDescription, function () {
        connection.createAnswer(function (localDescription) {
          connection.setLocalDescription(localDescription, function () {
            _this.ws.send('answer', {
              group: group,
              to: from,
              sdp: localDescription.sdp
            });
          });
        });
      });

      addPeerConnection(group, from, connection);
    });

    this.ws.on('answer', function (_ref3) {
      var group = _ref3.group;
      var from = _ref3.from;
      var sdp = _ref3.sdp;

      log('recieved answer');
      var connection = _this.connections.get(group, from);

      if (connection != null) {
        var remoteDescription = new RTCSessionDescription({
          sdp: sdp,
          type: 'answer'
        });
        connection.setRemoteDescription(remoteDescription);
      }
    });

    this.ws.on('candidate', function (_ref4) {
      var group = _ref4.group;
      var from = _ref4.from;
      var candidate = _ref4.candidate;

      log('recieved ice candidate');
      var connection = _this.connections.get(group, from);

      if (connection != null) {
        var _candidate = new RTCIceCandidate(_candidate);
        connection.addIceCandidate(_candidate);
      }
    });
  }

  _createClass(PeerGroup, [{
    key: 'attemptAction',
    value: function attemptAction(action, group, success, failure) {
      var _this2 = this;

      if (this.groups.has(group)) {
        return;
      }var actionFailure = '' + action + ' failed';

      var onSuccess = (function (_onSuccess) {
        function onSuccess(_x) {
          return _onSuccess.apply(this, arguments);
        }

        onSuccess.toString = function () {
          return _onSuccess.toString();
        };

        return onSuccess;
      })(function (subjectGroup) {
        if (subjectGroup !== group) return;
        _this2.ws.off(action, onSuccess);
        _this2.ws.off(actionFailure, onFailure);
        _this2.groups.add(group);
        _this2.trigger(_this2.events.join, group);
        success();
      });

      var onFailure = (function (_onFailure) {
        function onFailure(_x2) {
          return _onFailure.apply(this, arguments);
        }

        onFailure.toString = function () {
          return _onFailure.toString();
        };

        return onFailure;
      })(function (subjectGroup) {
        if (subjectGroup !== group) return;
        _this2.ws.off(action, onSuccess);
        _this2.ws.off(actionFailure, onFailure);
        failure();
      });

      this.ws.on(action, onSuccess);
      this.ws.on(actionFailure, onFailure);
      this.ws.send(action, group);
    }
  }, {
    key: 'create',
    value: function create(group) {
      var _this3 = this;

      return new Promise(function (resolve, reject) {
        _this3.attemptAction('create', group, resolve, reject);
      });
    }
  }, {
    key: 'join',
    value: function join(group) {
      var _this4 = this;

      return new Promise(function (resolve, reject) {
        _this4.attemptAction('join', group, resolve, reject);
      });
    }
  }, {
    key: 'joinOrCreate',
    value: function joinOrCreate(group) {
      var _this5 = this;

      return new Promise(function (resolve) {
        var create = function create() {
          return _this5.create(group).then(resolve)['catch'](join);
        };
        var join = function join() {
          return _this5.join(group).then(resolve)['catch'](create);
        };
        join();
      });
    }
  }, {
    key: 'peers',
    value: function peers(group) {
      return new Set(this.connections.get(group).keys());
    }
  }, {
    key: 'reestablishConnection',
    value: function reestablishConnection(group, id) {}
  }, {
    key: 'leave',
    value: function leave(group) {
      if (!this.groups.has(group)) {
        return;
      }this.ws.send('leave', group);

      this.groups['delete'](group);

      var connections = this.connections.get(group);
      if (connections != null) {
        connections.forEach(function (connection) {
          return connection.close();
        });
      }

      this.connections['delete'](group);
      this.channels['delete'](group);

      this.trigger(this.events.leave, group);
    }
  }, {
    key: 'on',
    value: function on(type, callback) {
      this.handlers.add(type, callback);
    }
  }, {
    key: 'off',
    value: function off(type, callback) {
      if (arguments.length === 1) this.handlers['delete'](type);else this.handlers['delete'](type, callback);
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
          handler.apply(null, args);
        });
      }
    }
  }, {
    key: 'send',
    value: function send(group, type, payload) {
      var channels = this.channels.get(group);
      if (channels != null) {
        (function () {
          var message = JSON.stringify([type, payload]);
          channels.forEach(function (channel) {
            return channel.send(message);
          });
        })();
      }
    }
  }, {
    key: 'sendTo',
    value: function sendTo(group, id, type, payload) {
      var channel = this.channels.get(group, id);
      if (channel != null) {
        channel.send(JSON.stringify([type, payload]));
      }
    }
  }, {
    key: 'close',
    value: function close() {
      var _this6 = this;

      this.ws.close();
      this.groups.forEach(function (group) {
        var connections = _this6.connections.get(group);
        if (connections != null) {
          connections.forEach(function (connection) {
            return connection.close();
          });
        }
      });
    }
  }]);

  return PeerGroup;
})();

PeerGroup.log = true;
PeerGroup.prototype.events = events;
PeerGroup.prototype.configuration = configuration;

module.exports = PeerGroup;