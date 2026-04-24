const Sidecar = require('bare-sidecar')

module.exports = function run(entrypoint, args = [], opts = {}) {
  return new Sidecar(entrypoint, args, opts)
}
