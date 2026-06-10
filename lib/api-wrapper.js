const Channel = require('bare-channel')
const Module = require('bare-module')
const Pipe = require('bare-pipe')
const { Duplex } = require('streamx')

function start() {
  const { args, control, ipcRead, ipcWrite, source, stdin, stdout, stderr } = Bare.Thread.self.data

  const controlPort = Channel.from(control).connect()

  const stream = createIPC(new Pipe(ipcRead), new Pipe(ipcWrite))

  stream.stdin = new Pipe(stdin)
  stream.stdout = new Pipe(stdout)
  stream.stderr = new Pipe(stderr)

  Bare.on('newListener', onNewListener)
    .on('removeListener', onRemoveListener)
    .on('uncaughtException', onError)
    .on('unhandledRejection', onError)
    .on('beforeExit', onBeforeExit)

  Bare.argv.splice(1) // TODO: replace the 2 left over with path to thread executable and module being run
  Bare.argv.push(...args)
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

start()

function createIPC(readable, writable) {
  const stream = new Duplex({
    read(cb) {
      cb(null)
    },
    write(data, cb) {
      writable.write(data, cb)
    },
    final(cb) {
      writable.end(cb)
    },
    destroy(cb) {
      readable.destroy()
      writable.destroy()
      cb(null)
    }
  })

  readable.on('data', (data) => stream.push(data))
  readable.on('end', () => stream.push(null))
  readable.on('error', (err) => stream.destroy(err))
  writable.on('error', (err) => stream.destroy(err))

  return stream
}
