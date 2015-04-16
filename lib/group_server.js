'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var WSServer = require('./ws_server');
var MapSet = require('./map_set');

var log = function log(message) {
  if (GroupServer.log) console.log(message);
};

var GroupServer = (function () {
  function GroupServer(port) {
    var _this = this;

    _classCallCheck(this, GroupServer);

    log('starting ultrawave server on port ' + port);

    this.wss = new WSServer({ port: port });

    // map group names to sets of peer ids
    this.groups = new MapSet();

    // map peer ids to sets of group names
    this.memberships = new MapSet();

    this.wss.on('open', function (id) {
      log('opened connection to ' + id);
      _this.wss.send(id, 'start', id);
    });

    this.wss.on('close', function (id) {
      log('closed connection to ' + id);

      var memberships = _this.memberships.get(id);
      if (memberships != null) {
        memberships.forEach(function (group) {
          _this.groups['delete'](group, id);
        });
      }

      _this.memberships['delete'](id);
    });

    this.wss.on('create', function (id, group) {
      if (_this.groups.has(group)) {
        log('client ' + id + ' failed to create ' + group);
        _this.wss.send(id, 'create failed', group);
      } else {
        log('client ' + id + ' created ' + group);
        _this.memberships.add(id, group);
        _this.groups.add(group, id);
        _this.wss.send(id, 'create', group);
      }
    });

    this.wss.on('join', function (id, group) {
      var peers = _this.groups.get(group);
      if (peers != null) {
        log('client ' + id + ' joined ' + group);
        peers.forEach(function (peer) {
          log('requsting offer from ' + peer + ' in ' + group);
          _this.wss.send(peer, 'request offer', { group: group, from: id });
        });
        _this.memberships.add(id, group);
        _this.groups.add(group, id);
        _this.wss.send(id, 'join', group);
      } else {
        log('client ' + id + ' failed to join ' + group);
        _this.wss.send(id, 'join failed', group);
      }
    });

    this.wss.on('leave', function (id, group) {
      log('client ' + id + ' left ' + group);

      _this.memberships['delete'](id, group);
      _this.groups['delete'](group, id);
    });

    this.wss.on('offer', function (id, _ref) {
      var sdp = _ref.sdp;
      var group = _ref.group;
      var to = _ref.to;

      log('client ' + id + ' sent offer to ' + to + ' in ' + group);
      _this.wss.send(to, 'offer', {
        sdp: sdp,
        group: group,
        from: id
      });
    });

    this.wss.on('answer', function (id, _ref2) {
      var sdp = _ref2.sdp;
      var group = _ref2.group;
      var to = _ref2.to;

      log('client ' + id + ' sent answer to ' + to + ' in ' + group);
      _this.wss.send(to, 'answer', {
        sdp: sdp,
        group: group,
        from: id
      });
    });

    this.wss.on('candidate', function (id, _ref3) {
      var candidate = _ref3.candidate;
      var group = _ref3.group;
      var to = _ref3.to;

      log('client ' + id + ' sent ice candidate to ' + to + ' in ' + group);
      _this.wss.send(to, 'candidate', {
        candidate: candidate,
        group: group,
        from: id });
    });
  }

  _createClass(GroupServer, [{
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