const PearRuntimeUpdater = require('pear-runtime-updater')
const ReadyResouce = require('ready-resource')
const Sidecar = require('bare-sidecar')
const Corestore = require('corestore')
const Hyperswarm = require('hyperswarm')
const path = require('path')

module.exports = class PearRuntime extends ReadyResouce {
  constructor(opts = {}) {
    super()
    if ((!opts.store && !!opts.swarm) || (!!opts.store && !opts.swarm)) {
      throw new Error('must pass store if passing swarm and vice versa')
    }
    this.dir = opts.dir
    if (!opts.store) opts.store = new Corestore(path.join(this.dir, 'pear-runtime/corestore'))
    this.swarm = opts.swarm || null
    this.isModuleSwarm = this.swarm === null
    this.bootstrap = opts.bootstrap
    this.store = opts.store
    this.storage = opts.storage || path.join(this.dir, 'app-storage')
    this.updater = new PearRuntimeUpdater(opts)
  }

  async _open() {
    await this.updater.ready()
    if (this.swarm === null) {
      const keyPair = await store.createKeyPair('pear-runtime')
      this.swarm = new Hyperswarm({ keyPair, bootstrap: this.bootstrap })
    }
    swarm.on('connection', (connection) => store.replicate(connection))
    swarm.join(updater.drive.core.discoveryKey, {
      client: true,
      server: false
    })
  }

  async _close() {
    if (this.isModuleSwarm) this.swarm.destroy()
    await this.updater.close()
  }

  run(entrypoint, args = [], opts = {}) {
    return new Sidecar(entrypoint, args, opts)
  }
}
