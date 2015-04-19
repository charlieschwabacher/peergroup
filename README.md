# Peergroup
A signalling server and messaging library for peer to peer communication over WebRTC data channels


### To install
`npm install peergroup`


### On the server

```javascript
GroupServer = require('peergroup/server');
var server = new GroupServer(3000);
```


### In the browser

```javascript
var peer = new PeerGroup('ws://localhost:3000');

peer.on('message', function(group, id, text) {
  alert(id + ' said ' + text + ' in ' + group);
})

peer.join('world').then(function() {
  peer.send('world', 'message', 'HELLO WORLD!');
});
```
