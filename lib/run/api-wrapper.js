const Module = require('bare-module')
const { startsWithWindowsDriveLetter } = require('bare-module-resolve')
const { pathToFileURL } = require('bare-url')
const { parentPort } = require('bare-worker')
const { Duplex } = require('bare-stream')

const { args, entrypoint } = Bare.Thread.self.data

const stream = new Duplex({
  write(data) {
    parentPort.postMessage(data)
  }
})
parentPort.on('message', (data) => stream.push(data))

global.Bare.argv = args
global.Bare.IPC = stream
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
