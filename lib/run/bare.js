const Channel = require('bare-channel')
const Module = require('bare-module')
const Thread = require('bare-thread')
const PortStream = require('../port-stream')

const wrapper = Thread.prepare(resolveBundled(require.resolve('../api-wrapper')), { shared: true })

module.exports = function run(entrypoint, args = [], opts = {}) {
  return new ThreadSidecar(entrypoint, args, opts)
}

class ThreadSidecar extends PortStream {
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
    super(ipc.connect())

    this._control = control.connect()
    this._exited = false
    this._exitCode = 0
    this._exitSignal = null
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

    this.stdin = new PortStream(stdin.connect())
    this.stdout = new PortStream(stdout.connect())
    this.stderr = new PortStream(stderr.connect())

    this._monitor().catch((err) => this.destroy(err))
  }

  async _monitor() {
    for await (const message of this._control) {
      switch (message.type) {
        case 'error':
          this._exitCode = 1
          this.destroy(message.error)
          return
        case 'exit':
          this._exitCode = message.code
          this._exitSignal = message.signal || null
          break
      }
    }

    this._onclose()
  }

  _onclose() {
    this._join()
    this.destroy()
  }

  _destroy(cb) {
    this.stdin.destroy()
    this.stdout.destroy()
    this.stderr.destroy()

    if (!this._exited) this._thread.terminate()
    this._join()

    this._port.close().catch(noop)
    this._control.close().catch(noop)

    cb(null)
  }

  _join() {
    if (this._exited) return

    this._thread.join()
    this._exited = true

    this.emit('exit', this._exitCode, this._exitSignal)
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
