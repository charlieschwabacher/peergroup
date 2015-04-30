const assert = require('assert')
const ReversibleMap = require('../src/reversible_map')

describe('ReversibleMap', () => {
  it('should set, has, get, delete', () => {
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