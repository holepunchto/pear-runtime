const Channel = require('bare-channel')
const Module = require('bare-module')
const Thread = require('bare-thread')
const { Duplex } = require('streamx')

const wrapper = Thread.prepare(resolveBundled(require.resolve('./api-wrapper')), { shared: true })

module.exports = function run(entrypoint, args = [], opts = {}) {
  return new ThreadSidecar(entrypoint, args, opts)
}

class ThreadSidecar extends Duplex {
  constructor(entrypoint, args = [], opts = {}) {
    if (!Array.isArray(args)) {
      opts = args
      args = []
    }

    const ipc = new Channel()
    const control = new Channel()
    const stdin = new Channel()
    const stdout = new Channel()
    const stderr = new Channel()
    const port = ipc.connect()

    super()

    this._port = port
    this._control = control.connect()
    this._thread = new Thread(wrapper, {
      ...opts,
      data: {
        args,
        source: Thread.prepare(resolveEntrypoint(entrypoint), { shared: true }),
        ipc: ipc.handle,
        control: control.handle,
        stdin: stdin.handle,
        stdout: stdout.handle,
        stderr: stderr.handle
      }
    })

    this.stdin = createPortStream(stdin.connect())
    this.stdout = createPortStream(stdout.connect())
    this.stderr = createPortStream(stderr.connect())

    this._monitor().catch((err) => this.destroy(err))
  }

  _read(cb) {
    read(this, this._port, cb)
  }

  _write(data, cb) {
    write(this._port, data, cb)
  }

  _final(cb) {
    close(this._port, cb)
  }

  async _monitor() {
    for await (const message of this._control) {
      switch (message.type) {
        case 'error':
          this.destroy(message.error)
          break
        case 'exit':
          this.emit('exit', message.code, message.signal || null)
          break
      }
    }

    this.destroy()
  }

  _destroy(cb) {
    this.stdin.destroy()
    this.stdout.destroy()
    this.stderr.destroy()

    this._thread.terminate()
    this._thread.join()

    this._port.close().catch(noop)
    this._control.close().catch(noop)

    cb(null)
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

function noop() {}

function resolveEntrypoint(entrypoint) {
  if (typeof entrypoint !== 'string' || entrypoint[0] !== '/') return entrypoint

  return resolveBundled(entrypoint)
}

function resolveBundled(filename) {
  if (typeof filename !== 'string' || filename[0] !== '/') return filename

  const bundled = new URL('bare:' + filename)

  if (filename.startsWith('/app.bundle/') || Module.protocol.exists(bundled)) return bundled.href

  return filename
}
