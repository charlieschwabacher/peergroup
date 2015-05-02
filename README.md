# Peergroup
A signalling server and messaging library for peer to peer communication over
[WebRTC](http://www.w3.org/TR/webrtc/) data channels


### To install
`npm install peergroup`


### On the server

```javascript
GroupServer = require('peergroup/server');
var server = new GroupServer({port: 3000});
```


### In the browser

```javascript
var peer = new PeerGroup('ws://localhost:3000');

peer.on('message', function(group, id, text) {
  alert(id + ' said ' + text + ' in ' + group);
});

peer.join('world').then(function() {
  peer.send('world', 'message', 'HELLO WORLD!');
});
```


### API

* `GroupServer`

  * `constructor(options)` - creates a new GroupServer, passing the options
  object through to a [WebSocketServer](//github.com/websockets/ws).  Available
  options include host, port, path, and server.

  * `stop()` - closes the websocket server.


* `PeerGroup`

  * `constructor({url, configuration})` - opens a connection to a group server,
    accepting the url to the server and optionally an
    [RTCConfiguration](http://www.w3.org/TR/webrtc/#idl-def-RTCPeerConnection)
    object to be passed to RTCPeerConnections.

  * `create(group)` - attempts to create a group with the provided name.
    Returns a promise which will succeed after the group is created.  If the
    group already exists the promise will be rejected.  Succuessfully creating
    a group triggers a 'join' event with the group name.

  * `join(group)` - attempts to join an existing group by name, returns a
    promise that will be rejected if the group does not already exist.  Triggers
    a 'join' event with the group name after successfully joining the group.

  * `joinOrCreate(group)` - attempts to a join a group by name, and if it
    does not exist, creates it.  It returns a promise, and triggers a 'join'
    event if successful.

  * `leave(group)` - leaves an existing group and triggers a 'leave' event.

  * `send(group, type, payload)` - sends a message to every peer in a group.
    Type can be any string, and payload can be any JSON serializable value.

  * `sendTo(group, id, type, payload)` - sends a message to a specifc peer in a
    group.

  * `peers(group)` - returns a Set object containing the ids of all peers in a
    group.

  * `on(type, callback)` - adds a listener to be triggered each time a message
    of matching type is received or a lifecycle event occurs.  Lifecycle events
    use symbols instead of strings as keys to avoid clashing with message types.
    The lifecycle events include the following:

      * `open` - triggered when a websocket connection to the peering server has
        been opened, passes the peerGroup instance as an argument.

      * `close` - triggered when the websocket connection to the peering server
        is closed

      * `start` - triggered when the handshake with the peering server is
        complete and the peerGroup instance has received an id.  After this
        event it is safe to start creating / joining groups and sending
        messages.

      * `join` - triggered when a group is successfully joined or created,
        includes the groupName as an argument.

      * `peer` - triggered when a data channel is opened to a new peer.
        Includes the group and peer id as arguments.

    To listen to lifecycle events, access the symbols through the
    `PeerGroup.events` object, for example:
    `peerGroup.on(PeerGroup.events.open, function(){});`

  * `off(type, callback)` - removes a listener for a message type or lifecycle
    event.

  * `close()` - closes all peer connections and the websocket connection to the
  server.  Triggers a 'close' event.

  * `ready` - a promise that resolves when the peerGroup instance has had an id
    assigned by the server and is ready to create and join rooms and send and
    receive message.

  * `id` - a unique string identifying the peer, assigned by the peering server
    after a connection has been established.  PeerGroup stores a secret key in
    local storage allowing a peer to reclaim the same id every time it connects
    to a GroupServer.


### Contributions

Contributions are welcome!  Before opening a pull make sure to `npm test` and
`npm run build`.

There are a lot of exciting things that can be built with peer to peer messaging
in the browser - if you are interested in using this library, and have ideas
or questions please don't hesitate to get in touch.
