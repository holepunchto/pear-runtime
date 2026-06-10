const Channel = require('bare-channel')
const Module = require('bare-module')
const Pipe = require('bare-pipe')

start()

function start() {
  const { args, control, ipc, source, stdin, stdout, stderr } = Bare.Thread.self.data

  const controlPort = Channel.from(control).connect()

  const stream = new Pipe(ipc)

  stream.stdin = new Pipe(stdin)
  stream.stdout = new Pipe(stdout)
  stream.stderr = new Pipe(stderr)

  Bare.on('newListener', onNewListener)
    .on('removeListener', onRemoveListener)
    .on('uncaughtException', onError)
    .on('unhandledRejection', onError)
    .on('beforeExit', onBeforeExit)

  Bare.argv.splice(0, ...args)
  Bare.IPC = stream
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
