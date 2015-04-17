const assert = require('assert')
const MapSet = require('../src/map_set')

describe('MapSet', () => {
  it('should add, has, and delete', () => {
    const mapSet = new MapSet

    assert(!mapSet.has('a', 1))

    mapSet.add('a', 1)
    assert(mapSet.has('a', 1))

    mapSet.delete('a', 1)
    assert(!mapSet.has('a', 1))
    assert.equal(mapSet.get('a'), undefined)
  })
})