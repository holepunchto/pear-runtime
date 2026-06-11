const Channel = require('bare-channel')
const IPC = require('bare-ipc')
const Module = require('bare-module')

function start() {
  const { args, control, ipc, source } = Bare.Thread.self.data

  const controlPort = Channel.from(control).connect()

  const stream = new IPC(ipc)

  Bare.on('newListener', onNewListener)
    .on('removeListener', onRemoveListener)
    .on('uncaughtException', onError)
    .on('unhandledRejection', onError)
    .on('beforeExit', onBeforeExit)

  Bare.argv.splice(1)
  Bare.argv.push(...args)
  Bare.IPC = stream
  Module.load(new URL('bare:/pear-runtime-worker.bundle'), source)

  function onError(error) {
    controlPort.writeSync({ type: 'error', error: serializeError(error) })
    Bare.exit(1)
  }

  async function onBeforeExit(code) {
    await controlPort.write({ type: 'exit', code })
    await controlPort.close()
  }

  function onNewListener(name, fn) {
    if (fn === onRemoveListener || fn === onError) return

    switch (name) {
      case 'uncaughtException':
      case 'unhandledRejection':
        Bare.off(name, onError)
    }
  }

  function onRemoveListener(name, fn) {
    if (fn === onRemoveListener || fn === onError) return

    switch (name) {
      case 'uncaughtException':
      case 'unhandledRejection':
        if (Bare.listenerCount(name) === 0) Bare.on(name, onError)
    }
  }
}

function serializeError(error) {
  return {
    code: error && error.code,
    message: error && error.message,
    name: error && error.name,
    stack: error && error.stack
  }
}

start()
