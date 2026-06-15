const Channel = require('bare-channel')
const IPC = require('bare-ipc')
const Thread = require('bare-thread')

const wrapper = Thread.prepare(require.resolve('../api-wrapper'), { shared: true })

module.exports = function run(entrypoint, args = [], opts = {}) {
  return new Worker(entrypoint, args, opts)
}

class Worker extends IPC {
  constructor(entrypoint, args = [], opts = {}) {
    if (!Array.isArray(args)) {
      opts = args
      args = []
    }

    const control = new Channel()
    const [ipc, workerIpc] = IPC.open()
    super(ipc)

    this._control = control.connect()
    this._exited = false
    this._exitCode = 0
    this._exitSignal = null
    this._terminating = false
    this._thread = new Thread(wrapper, {
      ...opts,
      data: {
        args: [entrypoint, ...args],
        source: Thread.prepare(entrypoint, { shared: true }),
        control: control.handle,
        ipc: workerIpc
      }
    })

    this._monitor().catch((err) => {
      console.error(err)
      Bare.exit(1)
    })
  }

  async _monitor() {
    for await (const message of this._control) {
      switch (message.type) {
        case 'error':
          this._exitCode = 1
          console.error(toError(message.error))
          Bare.exit(1)
          return
        case 'exit':
          this._exitCode = message.code
          this._exitSignal = message.signal || null
          break
      }
    }

    if (this._terminating) return

    this._onclose()
  }

  _onclose() {
    this._join()
    this.destroy()
  }

  _destroy(err, cb) {
    if (!this._exited) {
      this._terminating = true
      this._thread.terminate()
    }

    this._control.close().catch(noop)

    cb(err)
  }

  _join() {
    if (this._exited) return

    this._thread.join()
    this._exited = true

    this.emit('exit', this._exitCode, this._exitSignal)
  }
}

function noop() {}

function toError(error) {
  if (error instanceof Error) return error

  const err = new Error(error && error.message)
  err.name = (error && error.name) || 'Error'
  err.code = error && error.code
  err.stack = (error && error.stack) || err.stack
  return err
}
