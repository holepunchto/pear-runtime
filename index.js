const PearRuntimeUpdater = require('pear-runtime-updater')
const Sidecar = require('bare-sidecar')

module.exports = class PearRuntime extends PearRuntimeUpdater {
  constructor(config) {
    super(config)
  }

  run(entrypoint, args = [], opts = {}) {
    return new Sidecar(entrypoint, args, opts)
  }
}
