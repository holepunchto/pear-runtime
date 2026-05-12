const Module = require('bare-module')
const { startsWithWindowsDriveLetter } = require('bare-module-resolve')
const { pathToFileURL } = require('bare-url')
const { parentPort } = require('bare-worker')

const { args, entrypoint } = Bare.Thread.self.data

parentPort.write = (data) => parentPort.postMessage(data)

const onMessage = (data) => parentPort.emit('data', data)
const cleanup = () => parentPort.off('message', onMessage)

parentPort.on('message', onMessage)
parentPort.once('close', cleanup)

global.Bare.argv = args
global.Bare.IPC = parentPort
load()

async function load() {
  let url

  if (startsWithWindowsDriveLetter(entrypoint)) {
    url = null
  } else {
    url = URL.parse(entrypoint)
  }

  if (url === null) url = pathToFileURL(entrypoint)

  const source = Module.protocol.read(url)
  Module.load(url, source)
}
