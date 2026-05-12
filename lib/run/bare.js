const Worker = require('bare-worker')
const path = require('bare-path')

module.exports = function run(entrypoint, args = [], opts = {}) {
  const worker = new Worker(path.resolve(__dirname, 'api-wrapper.js'), {
    ...opts,
    workerData: { args, entrypoint }
  })

  worker.write = (data) => worker.postMessage(data)

  const onMessage = (data) => worker.emit('data', data)
  const cleanup = () => worker.off('message', onMessage)

  worker.on('message', onMessage)
  worker.once('close', cleanup)

  return worker
}
