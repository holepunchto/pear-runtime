const PearRuntimeUpdater = require('pear-runtime-updater')
const ReadyResource = require('ready-resource')
const Sidecar = require('bare-sidecar')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const path = require('path')

module.exports = class PearRuntime extends ReadyResource {
  constructor(opts = {}) {
    super()
    if ((!opts.store && opts.swarm) || (opts.store && !opts.swarm)) {
      throw new Error('must pass store if passing swarm and vice versa')
    }
    this.dir = opts.dir
    this.opts = opts
    if (!opts.store) opts.store = new Corestore(path.join(this.dir, 'pear-runtime/corestore'))
    this.store = opts.store
    this.swarm = opts.swarm || null
    this.bootstrap = opts.bootstrap
    this.storage = opts.storage || path.join(this.dir, 'app-storage')
    this.updater = new PearRuntimeUpdater(opts)
  }

  async _open() {
    await this.updater.ready()
    if (this.swarm === null) {
      const keyPair = await this.store.createKeyPair('pear-runtime')
      this.swarm = new Hyperswarm({ keyPair, bootstrap: this.bootstrap })
      this.swarm.on('connection', (connection) => this.store.replicate(connection))
      this.swarm.join(this.updater.drive.core.discoveryKey, {
        client: true,
        server: false
      })
    }
  }

  async _close() {
    if (this.opts.swarm) await this.swarm.destroy()
    await this.updater.close()
    if (this.opts.store) await this.store.close()
  }

  run(entrypoint, args = [], opts = {}) {
    return new Sidecar(entrypoint, args, opts)
  }
}
