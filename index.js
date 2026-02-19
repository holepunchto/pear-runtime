const PRU = require('pear-runtime-updater')
const ReadyResource = require('ready-resource')
const Sidecar = require('bare-sidecar')

module.exports = class PearRuntime extends ReadyResource {
  constructor(opts = {}) {
    if (!opts.dir) throw new Error('dir required')

    this.dir = opts.dir
    this.version = opts.version || 0
    this.storage = opts.storage || path.join(this.dir, 'app-storage')

    this.updater = opts.updates !== false ? new PRU(opts) : null

    this.ready().catch(noop)
  }

  async _open() {
    await this.updater?.ready()
  }

  async _close() {
    // TODO: close any sidecars
    await this.updater?.close()
  }

  run(entrypoint, args = [], opts = {}) {
    return new Sidecar(entrypoint, args, opts)
  }
}

function noop() {}
