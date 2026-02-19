const PRU = require('pear-runtime-updater')
const Sidecar = require('bare-sidecar')

module.exports = class PearRuntime {
  constructor(opts = {}) {
    this.updater = opts.updates ? new PRU(opts) : null
  }

  run(entrypoint, args = [], opts = {}) {
    return new Sidecar(entrypoint, args, opts)
  }
}
