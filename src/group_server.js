const ws = require('ws')
const crypto = require('crypto')
const MapSet = require('./map_set')
const WebSocketServer = ws.Server


const log = (message) => {
  if (GroupServer.log) console.log(message)
}


// Connecting clients are assigned randomly generated public IDs to identify
// them to their peers.  We want to clients to reclaim their ids in the future,
// but only to be able to claim ids that they have been assigned.  At the same
// time, we want to avoid storing ids for users to which we are no longer
// connected.  To achieve this, when first connecting to a client, we generate a
// 32 byte random string as a secret, and then take its sha256 hash. The hash is
// sent to peers as a public ID identifying the client, and the secret is sent
// to and stored by the connecting client.  When reconnecting, the client can
// then provide the hash for the server to securely regenerate the public ID.

const getIdKeyPair = (cb) => {
  crypto.randomBytes(32, (ex, buffer) => {
    const id = crypto.createHash('sha256').update(buffer).digest('base64')
    const secret = buffer.toString('base64')
    cb(id, secret)
  })
}

const getIdFromKey = (secret) => {
  return crypto.createHash('sha256').update(secret, 'base64').digest('base64')
}



class GroupServer {

  constructor(options) {

    this.wss = new WebSocketServer(options)


    // map event type to set of handlers
    this.handlers = new MapSet

    // map peer id to web socket connection
    this.sockets = new Map

    // map group names to sets of peer ids
    this.groups = new MapSet

    // map peer ids to sets of group names
    this.memberships = new MapSet


    const close = (id) => {
      const memberships = this.memberships.get(id)
      if (memberships != null) {
        memberships.forEach((group) => {
          this.groups.delete(group, id)
        })
      }
      this.memberships.delete(id)
      this.sockets.delete(id)
    }


    // handle incoming connections

    this.wss.on('connection', (ws) => {
      getIdKeyPair((id, secret) => {
        log(`opened connection to ${id}`)
        this.sockets.set(id, ws)
        this.send(id, 'id', {id: id, secret: secret})

        ws.addEventListener('close', (e) => {
          log(`closed connection to ${id}`)
          close(id)
        })

        ws.addEventListener('message', (e) => {
          const [type, payload] = JSON.parse(e.data)
          this.trigger(type, id, payload)
        })
      })
    })


    // handle messages from clients

    this.on('id', (id, secret) => {
      const nextId = getIdFromKey(secret)
      const ws = this.sockets.get(id)

      close(id)
      this.sockets.set(nextId, ws)

      ws.removeAllListeners('message')
      ws.addEventListener('message', (e) => {
        const [type, payload] = JSON.parse(e.data)
        this.trigger(type, nextId, payload)
      })

      this.send(nextId, 'id', {id: nextId, secret: secret})
    })

    this.on('create', (id, group) => {
      if (this.groups.has(group)) {
        log(`client ${id} failed to create ${group}`)
        this.send(id, 'create failed', group)
      } else {
        log(`client ${id} created ${group}`)
        this.memberships.add(id, group)
        this.groups.add(group, id)
        this.send(id, 'create', group)
      }
    })

    this.on('join', (id, group) => {
      const peers = this.groups.get(group)
      if (peers != null) {
        log(`client ${id} joined ${group}`)
        peers.forEach((peer) => {
          log(`requsting offer from ${peer} in ${group}`)
          this.send(peer, 'request offer', {group: group, from: id})
        })
        this.memberships.add(id, group)
        this.groups.add(group, id)
        this.send(id, 'join', group)
      } else {
        log(`client ${id} failed to join ${group}`)
        this.send(id, 'join failed', group)
      }
    })

    this.on('leave', (id, group) => {
      log(`client ${id} left ${group}`)

      this.memberships.delete(id, group)
      this.groups.delete(group, id)
    })

    this.on('offer', (id, {sdp, group, to}) => {
      log(`client ${id} sent offer to ${to} in ${group}`)
      this.send(to, 'offer', {
        sdp: sdp,
        group: group,
        from: id
      })
    })

    this.on('answer', (id, {sdp, group, to}) => {
      log(`client ${id} sent answer to ${to} in ${group}`)
      this.send(to, 'answer', {
        sdp: sdp,
        group: group,
        from: id
      })
    })

    this.on('candidate', (id, {candidate, group, to}) => {
      log(`client ${id} sent ice candidate to ${to} in ${group}`)
      this.send(to, 'candidate', {
        candidate: candidate,
        group: group,
        from:
      id})
    })
  }

  on(type, callback) {
    this.handlers.add(type, callback)
  }

  off(type, callback) {
    this.handlers.delete(type, callback)
  }

  trigger(type, ...args) {
    const handlers = this.handlers.get(type)
    if (handlers != null) {
      handlers.forEach((handler) => handler.apply(null, args))
    }
  }

  send(id, type, payload) {
    const socket = this.sockets.get(id)
    if (socket != null) {
      socket.send(JSON.stringify([type, payload]))
    }
  }

  stop() {
    log('stopping ultrawave server')
    this.wss.close()
  }

}

GroupServer.log = true

module.exports = GroupServer

