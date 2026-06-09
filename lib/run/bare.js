const Channel = require('bare-channel')
const Module = require('bare-module')
const Pipe = require('bare-pipe')
const Thread = require('bare-thread')

const wrapper = Thread.prepare(resolveBundled(require.resolve('../api-wrapper')), { shared: true })

module.exports = function run(entrypoint, args = [], opts = {}) {
  return new ThreadSidecar(entrypoint, args, opts)
}

class ThreadSidecar extends Pipe {
  constructor(entrypoint, args = [], opts = {}) {
    if (!Array.isArray(args)) {
      opts = args
      args = []
    }

    const control = new Channel()
    const ipc = Pipe.pipe()
    const stdin = Pipe.pipe()
    const stdout = Pipe.pipe()
    const stderr = Pipe.pipe()
    super(ipc[0])

    this._control = control.connect()
    this._exited = false
    this._exitCode = 0
    this._exitSignal = null
    this._thread = new Thread(wrapper, {
      ...opts,
      data: {
        args,
        source: Thread.prepare(resolveEntrypoint(entrypoint), { shared: true }),
        control: control.handle,
        ipc: ipc[1],
        stdin: stdin[1],
        stdout: stdout[1],
        stderr: stderr[1]
      }
    })

    this.stdin = new Pipe(stdin[0])
    this.stdout = new Pipe(stdout[0])
    this.stderr = new Pipe(stderr[0])

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

  _destroy(err, cb) {
    this.stdin.destroy()
    this.stdout.destroy()
    this.stderr.destroy()

    if (!this._exited) this._thread.terminate()
    this._join()

    this._control.close().catch(noop)

    super._destroy(err, cb)
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
