const Channel = require('bare-channel')
const Module = require('bare-module')
const { Duplex } = require('streamx')

start()

function start(data) {
  const { args, control, ipc, source, stdin, stdout, stderr } = Bare.Thread.self.data

  const controlPort = Channel.from(control).connect()

  const stream = createPortStream(Channel.from(ipc).connect())

  stream.stdin = createPortStream(Channel.from(stdin).connect())
  stream.stdout = createPortStream(Channel.from(stdout).connect())
  stream.stderr = createPortStream(Channel.from(stderr).connect())

  Bare.on('uncaughtException', onerror)
  Bare.on('unhandledRejection', onerror)
  Bare.on('beforeExit', onbeforeexit)

  global.Bare.argv = args
  global.Bare.IPC = stream
  Module.load(new URL('bare:/pear-runtime-worker.bundle'), source)

  async function onerror(error) {
    await controlPort.write({ type: 'error', error })

    Bare.exitCode = 1
  }

  async function onbeforeexit(code) {
    await controlPort.write({ type: 'exit', code })
    await controlPort.close()
  }
}

function createPortStream(port) {
  return new Duplex({
    read(cb) {
      read(this, port, cb)
    },
    write(data, cb) {
      write(port, data, cb)
    },
    final(cb) {
      close(port, cb)
    },
    destroy: destroyPort(port)
  })
}

async function read(stream, port, cb) {
  try {
    stream.push(await port.read())
    cb(null)
  } catch (err) {
    cb(err)
  }
}

async function write(port, data, cb) {
  try {
    await port.write(data)
    cb(null)
  } catch (err) {
    cb(err)
  }
}

async function close(port, cb) {
  try {
    await port.close()
    cb(null)
  } catch (err) {
    cb(err)
  }
}

function destroyPort(port) {
  return async function (cb) {
    try {
      await port.close()
      cb(null)
    } catch (err) {
      cb(err)
    }
  }
}
