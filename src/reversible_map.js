module.exports = class ReversibleMap {

  constructor() {
    this.map = new Map
    this.reverseMap = new Map
  }

  get(key) {
    return this.map.get(key)
  }

  keyFor(value) {
    return this.reverseMap.get(value)
  }

  has(key) {
    return this.map.has(key)
  }

  hasValue(value) {
    return this.reverseMap.has(value)
  }

  set(key, value) {
    this.reverseMap.set(value, key)
    return this.map.set(key, value)
  }

  delete(key) {
    const value = this.map.get(key)
    this.reverseMap.delete(value)
    return this.map.delete(key)
  }

}