const Worker = require('bare-worker')

module.exports = function run(entrypoint, args = [], opts = {}) {
  return new Worker(entrypoint, { ...opts, argv: args })
}
