const Worker = require('bare-worker')

module.exports = function run(entrypoint, argv = [], opts = {}) {
  const worker = new Worker(entrypoint, { ...opts, argv })
  worker.IPC.once('close', () => worker.terminate())
  return worker.IPC
}
