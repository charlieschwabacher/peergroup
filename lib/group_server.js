'use strict';

var _slicedToArray = function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var ws = require('ws');
var crypto = require('crypto');
var MapSet = require('./map_set');
var WebSocketServer = ws.Server;

var log = function log(message) {
  if (GroupServer.log) console.log(message);
};

// Connecting clients are assigned randomly generated public IDs to identify
// them to their peers.  We want to clients to reclaim their ids in the future,
// but only to be able to claim ids that they have been assigned.  At the same
// time, we want to avoid storing ids for users to which we are no longer
// connected.  To achieve this, when first connecting to a client, we generate a
// 32 byte random string as a secret, and then take its sha256 hash. The hash is
// sent to peers as a public ID identifying the client, and the secret is sent
// to and stored by the connecting client.  When reconnecting, the client can
// then provide the hash for the server to securely regenerate the public ID.

var getIdKeyPair = function getIdKeyPair(cb) {
  crypto.randomBytes(32, function (ex, buffer) {
    var id = crypto.createHash('sha256').update(buffer).digest('base64');
    var secret = buffer.toString('base64');
    cb(id, secret);
  });
};

var getIdFromKey = function getIdFromKey(secret) {
  return crypto.createHash('sha256').update(secret, 'base64').digest('base64');
};

var GroupServer = (function () {
  function GroupServer(options) {
    var _this = this;

    _classCallCheck(this, GroupServer);

    this.wss = new WebSocketServer(options);

    // map event type to set of handlers
    this.handlers = new MapSet();

    // map peer id to web socket connection
    this.sockets = new Map();

    // map group names to sets of peer ids
    this.groups = new MapSet();

    // map peer ids to sets of group names
    this.memberships = new MapSet();

    var close = function close(id) {
      var memberships = _this.memberships.get(id);
      if (memberships != null) {
        memberships.forEach(function (group) {
          _this.groups['delete'](group, id);
        });
      }
      _this.memberships['delete'](id);
      _this.sockets['delete'](id);
    };

    // handle incoming connections

    this.wss.on('connection', function (ws) {
      getIdKeyPair(function (id, secret) {
        log('opened connection to ' + id);
        _this.sockets.set(id, ws);
        _this.send(id, 'id', { id: id, secret: secret });

        ws.addEventListener('close', function (e) {
          log('closed connection to ' + id);
          close(id);
        });

        ws.addEventListener('message', function (e) {
          var _JSON$parse = JSON.parse(e.data);

          var _JSON$parse2 = _slicedToArray(_JSON$parse, 2);

          var type = _JSON$parse2[0];
          var payload = _JSON$parse2[1];

          _this.trigger(type, id, payload);
        });
      });
    });

    // handle messages from clients

    this.on('id', function (id, secret) {
      var nextId = getIdFromKey(secret);

      if (_this.sockets.has(nextId)) {
        _this.send(id, 'id', { id: id });
      } else {
        var _ws = _this.sockets.get(id);

        close(id);
        _this.sockets.set(nextId, _ws);

        _ws.removeAllListeners('message');
        _ws.addEventListener('message', function (e) {
          var _JSON$parse3 = JSON.parse(e.data);

          var _JSON$parse32 = _slicedToArray(_JSON$parse3, 2);

          var type = _JSON$parse32[0];
          var payload = _JSON$parse32[1];

          _this.trigger(type, nextId, payload);
        });

        _this.send(nextId, 'id', { id: nextId, secret: secret });
      }
    });

    this.on('create', function (id, group) {
      if (_this.groups.has(group)) {
        log('client ' + id + ' failed to create ' + group);
        _this.send(id, 'create failed', group);
      } else {
        log('client ' + id + ' created ' + group);
        _this.memberships.add(id, group);
        _this.groups.add(group, id);
        _this.send(id, 'create', group);
      }
    });

    this.on('join', function (id, group) {
      var peers = _this.groups.get(group);
      if (peers != null) {
        log('client ' + id + ' joined ' + group);
        peers.forEach(function (peer) {
          log('requsting offer from ' + peer + ' in ' + group);
          _this.send(peer, 'request offer', { group: group, from: id });
        });
        _this.memberships.add(id, group);
        _this.groups.add(group, id);
        _this.send(id, 'join', group);
      } else {
        log('client ' + id + ' failed to join ' + group);
        _this.send(id, 'join failed', group);
      }
    });

    this.on('leave', function (id, group) {
      log('client ' + id + ' left ' + group);

      _this.memberships['delete'](id, group);
      _this.groups['delete'](group, id);
    });

    this.on('offer', function (id, _ref) {
      var sdp = _ref.sdp;
      var group = _ref.group;
      var to = _ref.to;

      log('client ' + id + ' sent offer to ' + to + ' in ' + group);
      _this.send(to, 'offer', {
        sdp: sdp,
        group: group,
        from: id
      });
    });

    this.on('answer', function (id, _ref2) {
      var sdp = _ref2.sdp;
      var group = _ref2.group;
      var to = _ref2.to;

      log('client ' + id + ' sent answer to ' + to + ' in ' + group);
      _this.send(to, 'answer', {
        sdp: sdp,
        group: group,
        from: id
      });
    });

    this.on('candidate', function (id, _ref3) {
      var candidate = _ref3.candidate;
      var group = _ref3.group;
      var to = _ref3.to;

      log('client ' + id + ' sent ice candidate to ' + to + ' in ' + group);
      _this.send(to, 'candidate', {
        candidate: candidate,
        group: group,
        from: id });
    });
  }

  _createClass(GroupServer, [{
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
    value: function send(id, type, payload) {
      var socket = this.sockets.get(id);
      if (socket != null) {
        socket.send(JSON.stringify([type, payload]));
      }
    }
  }, {
    key: 'stop',
    value: function stop() {
      log('stopping ultrawave server');
      this.wss.close();
    }
  }]);

  return GroupServer;
})();

GroupServer.log = true;

module.exports = GroupServer;