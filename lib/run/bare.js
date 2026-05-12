const Worker = require('bare-worker')
const { Duplex } = require('bare-stream')
const path = require('bare-path')

module.exports = function run(entrypoint, args = [], opts = {}) {
  const worker = new Worker(path.resolve(__dirname, 'api-wrapper.js'), {
    ...opts,
    workerData: { args, entrypoint }
  })

  const stream = new Duplex({
    write(data) {
      worker.postMessage(data)
    }
  })
  worker.on('message', (data) => stream.push(data))

  return stream
}
