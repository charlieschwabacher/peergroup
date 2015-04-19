# peergroup
A peering server and messaging library for peer to peer communication over WebRTC data channels


## to install:
`npm install peergroup`


## on the server:

```javascript
GroupServer = require('peergroup/server');
var server = new GroupServer(3000);
```


## in the browser

```javascript
peer = new PeerGroup('ws://localhost:3000');

peer.on('message', function(group, id, text) {
  alert(id + ' said ' + text + ' in ' + group);
})

peer.join('world').then(function() {
  peer.send('world', 'message', 'HELLO WORLD!');
})
```
