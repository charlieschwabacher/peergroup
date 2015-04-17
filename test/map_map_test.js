const assert = require('assert')
const MapMap = require('../src/map_map')

describe('MapMap', () => {
  it('should set, has, and get', () => {
    const mapMap = new MapMap

    assert(!mapMap.has('a', 'b'))

    mapMap.set('a', 'b', 1)

    assert(mapMap.has('a'))
    assert(mapMap.has('a', 'b'))

    assert.equal(mapMap.get('a', 'b'), 1)

    mapMap.delete('a', 'b')

    assert(!mapMap.has('a'))
    assert(!mapMap.has('a', 'b'))
    assert.equal(mapMap.get('a'), undefined)
  })
})