const { Duplex } = require('streamx')

module.exports = class PortStream extends Duplex {
  constructor(port) {
    super()

    this._port = port
  }

  async _read(cb) {
    try {
      this.push(await this._port.read())
      cb(null)
    } catch (err) {
      cb(err)
    }
  }

  async _write(data, cb) {
    try {
      await this._port.write(data)
      cb(null)
    } catch (err) {
      cb(err)
    }
  }

  async _final(cb) {
    try {
      await this._port.close()
      cb(null)
    } catch (err) {
      cb(err)
    }
  }

  async _destroy(cb) {
    try {
      await this._port.close()
      cb(null)
    } catch (err) {
      cb(err)
    }
  }
}
