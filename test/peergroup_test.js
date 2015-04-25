// mock browser environment

global.WebSocket = require('ws')
global.window = require('rtc-mocks')

// require dependancies

const assert = require('assert')
const PeerGroup = require('../src/peergroup')
const GroupServer = require('../src/group_server')
const events = PeerGroup.prototype.events

PeerGroup.log = false
GroupServer.log = false

let port = 5000



// extend server and client classes with some expectation methods

PeerGroup.prototype.shouldSend = function(expectedType, expectedPaylod, done) {
  this.ws.send = (type, payload) => {
    assert.equal(type, expectedType)
    assert.equal(payload, expectedPaylod)
    done()
  }
}

GroupServer.prototype.shouldSend = (
  function(expectedId, expectedType, expectedPayload, done) {
    this.wss.send = (id, type, payload) => {
      assert.equal(id, expectedId)
      assert.equal(type, expectedType)
      assert.equal(payload, expectedPayload)
      done()
    }
  }
)

const setupRoom = (peers, groupName, callback) => {
  let remainingPeers = peers.length * (peers.length - 1)
  peers.forEach((peer) => {
    peer.on(events.start, () => peer.joinOrCreate(groupName))
    peer.on(events.peer, () => {
      if ((remainingPeers -= 1) === 0) callback()
    })
  })
}



describe('PeerGroup:', () => {

  describe('when a peer connects to a server', () => {
    it('the peer should trigger an open event and set open prop', (done) => {
      const server = new GroupServer({port: port += 1})
      const client = new PeerGroup(`ws:localhost:${port}`)

      assert(!client.open)

      client.on(events.open, () => {
        assert(client.open)
        done()
      })
    })

    it('the server should send "start" with the peer id', (done) => {
      const server = new GroupServer({port: port += 1})
      server.wss.send = (id, type, payload) => {
        assert.equal(type, 'start')
        assert.equal(payload, id)
        done()
      }
      const client = new PeerGroup(`ws:localhost:${port}`)
    })

    it('the peer should set its id', () => {
      const server = new GroupServer({port: port += 1})
      const client = new PeerGroup(`ws:localhost:${port}`)
      assert.strictEqual(client.id, null)
      client.ws.trigger('start', 'abc')
      assert.equal(client.id, 'abc')
    })
  })


  describe('when a peer attempts to create a group', () => {
    it('the peer should send "create" with the group name', (done) => {
      const server = new GroupServer({port: port += 1})
      const client = new PeerGroup(`ws:localhost:${port}`)
      client.shouldSend('create', 'lobby', done)
      client.create('lobby')
    })

    describe('and the group already exists', () => {
      it('the server should send "create failed" w/ the group name', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        server.groups.map.set('lobby', new Set)
        client.on(events.start, () => {
          server.shouldSend(client.id, 'create failed', 'lobby', done)
          client.create('lobby')
        })
      })

      it('the peer should return and reject a promise', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        server.groups.map.set('lobby', new Set)
        client.on(events.open, () => {
          client.create('lobby').catch(done)
        })
      })
    })

    describe('and the group does not yet exist', () => {
      it('the server should send "create" with the group name', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        client.on(events.start, () => {
          server.shouldSend(client.id, 'create', 'lobby', done)
          client.create('lobby')
        })
      })

      it('the peer should add the group to its groups set', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        client.on(events.open, () => {
          client.create('lobby').then(() => {
            assert(client.groups.has('lobby'))
            done()
          })
        })
      })

      it('the peer should trigger a join event with the group', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        client.on(events.join, (group) => {
          assert.equal(group, 'lobby')
          done()
        })
        client.on(events.open, () => {
          client.create('lobby')
        })
      })

      it('the peer should run its success callback', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        client.on(events.open, () => {
          client.create('lobby').then(done)
        })
      })
    })
  })

  describe('when a peer attempts to join an existing group', () => {
    it('the peer should send "join" with the group name', (done) => {
      const server = new GroupServer({port: port += 1})
      const client = new PeerGroup(`ws:localhost:${port}`)
      client.shouldSend('join', 'lobby', done)
      client.join('lobby')
    })

    describe('and the group already exists,', () => {
      it('the server should send "join" with the group name', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        server.groups.map.set('lobby', new Set)
        client.on(events.start, () => {
          server.shouldSend(client.id, 'join', 'lobby', done)
          client.join('lobby')
        })
      })

      it('the peer should add the group to its groups set', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        server.groups.map.set('lobby', new Set)
        client.on(events.open, () => {
          client.join('lobby').then(() => {
            assert(client.groups.has('lobby'))
            done()
          })
        })
      })

      it('the peer should trigger a join event with the group', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        server.groups.map.set('lobby', new Set)
        client.on(events.join, (group) => {
          assert.equal(group, 'lobby')
          done()
        })
        client.on(events.open, () => {
          client.join('lobby')
        })
      })

      it('the peer should run its success callback', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        server.groups.map.set('lobby', new Set)
        client.on(events.open, () => {
          client.join('lobby').then(done)
        })
      })
    })

    describe('and the group does not yet exist,', () => {
      it('the server should send "join failed" with the group name', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        client.on(events.start, () => {
          server.shouldSend(client.id, 'join failed', 'lobby', done)
          client.join('lobby')
        })
      })

      it('the peer should run its failure callback', (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        client.on(events.open, () => {
          client.join('lobby').catch(done)
        })
      })
    })
  })

  describe('when a peer sends a message in a group', () => {
    it('the peers should receive the message and trigger events', (done) => {
      const server = new GroupServer({port: port += 1})
      const peers = [1, 2, 3].map(() => new PeerGroup(`ws:localhost:${port}`))
      setupRoom(peers, 'lobby', () => {

        // first peer sends a message, all others should receive it
        let remainingMessages = peers.length - 1
        peers.slice(1).forEach((peer) => {
          peer.on('message', (group, id, payload) => {
            assert.equal(group, 'lobby')
            assert.equal(id, peers[0].id)
            assert.equal(payload, 'testing')
            if ((remainingMessages -= 1) === 0) done()
          })
        })

        peers[0].send('lobby', 'message', 'testing')
      })
    })
  })


  describe('when a peer leaves a group', () => {
    it('the server should remove user from list of group members', (done) => {
      const server = new GroupServer({port: port += 1})
      const client = new PeerGroup(`ws:localhost:${port}`)
      server.groups.add('lobby', 'abcd')
      client.on(events.start, () => {
        client.join('lobby').then(() => {
          assert(server.groups.has('lobby', client.id))
          assert(server.memberships.has(client.id, 'lobby'))
          client.leave('lobby')

          // we don't have a callback, so set a 10ms timeout here to wait for
          // ws communication to complete
          setTimeout(() => {
            assert(!server.groups.has('lobby', client.id))
            assert(!server.memberships.has(client.id, 'lobby'))
            assert(server.groups.has('lobby', 'abcd'))
            done()
          }, 10)
        })
      })
    })

    describe('and the group becomes empty,', () => {
      it(`the server should clean up references to the group if the group
          becomes empty`, (done) => {
        const server = new GroupServer({port: port += 1})
        const client = new PeerGroup(`ws:localhost:${port}`)
        assert(!server.groups.has('lobby'))
        client.on(events.start, () => {
          client.create('lobby').then(() => {
            assert(server.groups.has('lobby'))
            client.leave('lobby')

            // we don't have a callback so set a 10ms timeout here to wait for
            // ws communication
            setTimeout(() => {
              assert(!server.groups.has('lobby'))
              done()
            }, 10)
          })
        })
      })

      it('the peers should clean up their closed connections', (done) => {
        const server = new GroupServer({port: port += 1})
        const peers = [1, 2, 3].map(() => new PeerGroup(`ws:localhost:${port}`))
        setupRoom(peers, 'lobby', () => {
          peers.forEach((peer) => {
            assert.equal(peer.connections.get('lobby').size, 2)
          })
          peers[0].leave('lobby')

          // we set timeout here to wait for p2p communication, because this is
          // mocked we can just run on the next tick
          setTimeout(() => {
            peers.slice(1).forEach((peer) => {
              assert.equal(peer.connections.get('lobby').size, 1)
            })
            done()
          })
        })
      })
    })
  })


  describe('when a peer disconnects from a server', () => {
    it('the server should clean up references to the user', (done) => {
      const server = new GroupServer({port: port += 1})
      const client = new PeerGroup(`ws:localhost:${port}`)
      client.on(events.start, () => {
        client.create('lobby').then(() => {
          assert(server.groups.has('lobby'), client.id)
          assert(server.memberships.has(client.id))
          client.close()

          // we don't have a callback so set a 10ms timeout here to wait for
          // ws communication
          setTimeout(() => {
            assert(!server.groups.has('lobby', client.id))
            assert(!server.memberships.has(client.id))
            done()
          }, 10)
        })
      })
    })

    it('the peers should clean up their closed connections', (done) => {
      const server = new GroupServer({port: port += 1})
      const peers = [1, 2, 3].map(() => new PeerGroup(`ws:localhost:${port}`))
      setupRoom(peers, 'lobby', () => {
        peers.forEach((peer) => {
          assert.equal(peer.connections.get('lobby').size, 2)
        })
        peers[0].close()

        // we set timeout here to wait for p2p communication, because this is
        // mocked we can just run on the next tick
        setTimeout(() => {
          peers.slice(1).forEach((peer) => {
            assert.equal(peer.connections.get('lobby').size, 1)
          })
          done()
        })
      })
    })
  })

})



