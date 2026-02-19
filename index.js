const PearRuntimeUpdater = require('pear-runtime-updater')
const Sidecar = require('bare-sidecar')
const path = require('path')

module.exports = class PearRuntime extends PearRuntimeUpdater {
  constructor(opts = {}) {
    super(opts)

    this.dir = opts.dir
    this.storage = opts.storage || path.join(this.dir, 'app-storage')
  }

  run(entrypoint, args = [], opts = {}) {
    return new Sidecar(entrypoint, args, opts)
  }
}
