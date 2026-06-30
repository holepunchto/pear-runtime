const Worker = require('bare-worker')

module.exports = function run(entrypoint, argv = [], opts = {}) {
  return new Worker(entrypoint, { ...opts, argv })
}
