const Channel = require('bare-channel')
const Module = require('bare-module')
const PortStream = require('./port-stream')

start()

function start() {
  const { args, control, ipc, source, stdin, stdout, stderr } = Bare.Thread.self.data

  const controlPort = Channel.from(control).connect()

  const stream = new PortStream(Channel.from(ipc).connect())

  stream.stdin = new PortStream(Channel.from(stdin).connect())
  stream.stdout = new PortStream(Channel.from(stdout).connect())
  stream.stderr = new PortStream(Channel.from(stderr).connect())

  Bare.on('newListener', onNewListener)
    .on('removeListener', onRemoveListener)
    .on('uncaughtException', onError)
    .on('unhandledRejection', onError)
    .on('beforeExit', onBeforeExit)

  global.Bare.argv = args
  global.Bare.IPC = stream
  Module.load(new URL('bare:/pear-runtime-worker.bundle'), source)

  async function onError(error) {
    await controlPort.write({ type: 'error', error })

    Bare.exitCode = 1
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
