const PearRuntimeUpdater = require('pear-runtime-updater')
const ReadyResouce = require('ready-resource')
const Sidecar = require('bare-sidecar')
const path = require('path')

module.exports = class PearRuntime extends ReadyResouce {
  constructor(opts = {}) {
    super()

    this.dir = opts.dir
    this.storage = opts.storage || path.join(this.dir, 'app-storage')
    this.updater = new PearRuntimeUpdater(opts)

    this.updater.on('updating', () => this.emit('updating'))
    this.updater.on('updating-delta', (data) => this.emit('updating-delta', data))
    this.updater.on('updated', () => this.emit('updated'))
  }

  async _open() {
    await this.updater.ready()
  }

  async _close() {
    await this.updater.close()
  }

  async applyUpdate() {
    return this.updater.applyUpdate()
  }

  run(entrypoint, args = [], opts = {}) {
    return new Sidecar(entrypoint, args, opts)
  }
}
