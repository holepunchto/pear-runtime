const Bundle = require('bare-bundle')
const fs = require('bare-fs')
const Module = require('bare-module')
const os = require('bare-os')
const path = require('bare-path')
const { Duplex } = require('bare-stream')
const { spawn } = require('bare-subprocess')

const bundleURL = 'bare:/app.bundle'
const bundlePath = '/app.bundle'

module.exports = function run(entrypoint, args = [], opts = {}) {
  return new Process(entrypoint, args, opts)
}

class Process extends Duplex {
  constructor(entrypoint, args = [], opts = {}) {
    if (!Array.isArray(args)) {
      opts = args
      args = []
    }

    super()

    if (typeof entrypoint !== 'string') entrypoint = entrypoint.toString()

    const stdio = normalizeStdio(opts.stdio)
    const ipc = stdio.indexOf('ipc')
    const env = normalizeEnv(opts.env)
    const spawnStdio = normalizeSpawnStdio(stdio, env, ipc)

    this._process = spawn(getBareExecutable(), [getEntrypoint(entrypoint), ...args], {
      ...opts,
      env,
      stdio: spawnStdio,
      serialization: 'binary'
    })

    this._process.on('exit', this._onexit.bind(this)).on('close', this._onclose.bind(this))

    const channel = this._process.stdio[ipc]

    this._ipc = channel.on('end', this._onend.bind(this)).on('error', this._onerror.bind(this))
  }

  get stdin() {
    return this._process.stdin
  }

  get stdout() {
    return this._process.stdout
  }

  get stderr() {
    return this._process.stderr
  }

  get subprocess() {
    return this._process
  }

  _read() {
    const data = this._ipc.read()

    if (data) this.push(data)
    else this._ipc.once('data', (data) => this.push(data))
  }

  _write(chunk, encoding, cb) {
    this._ipc.write(chunk, encoding, cb)
  }

  _destroy(err, cb) {
    this._process.kill()
    cb(err)
  }

  _onexit(code, signal) {
    this.emit('exit', code, signal)
  }

  _onclose() {
    this.destroy()
  }

  _onend() {
    this._ipc.end()
    this.push(null)
  }

  _onerror(err) {
    this.destroy(err)
  }
}

function getEntrypoint(entrypoint) {
  if (!isBundleEntrypoint(entrypoint)) return entrypoint

  return materializeBundle(entrypoint) || entrypoint
}

function isBundleEntrypoint(entrypoint) {
  return entrypoint.startsWith(bundleURL + '/') || entrypoint.startsWith(bundlePath + '/')
}

function materializeBundle(entrypoint) {
  const app = Module._cache[bundleURL]

  if (!app || !app._source) return null

  const bundle = Bundle.from(app._source)
  const main = toBundleKey(entrypoint)

  if (!bundle.exists(main)) return null

  bundle.main = main

  const dir = path.join(os.tmpdir(), 'pear-runtime')
  const file = path.join(dir, `${app._source.byteLength}-${safeName(main)}.bundle`)

  fs.mkdirSync(dir, { recursive: true })

  try {
    fs.accessSync(file)
  } catch {
    fs.writeFileSync(file, bundle.toBuffer())
  }

  return file
}

function toBundleKey(entrypoint) {
  if (entrypoint.startsWith(bundleURL + '/')) return entrypoint.slice(bundleURL.length)
  if (entrypoint.startsWith(bundlePath + '/')) return entrypoint.slice(bundlePath.length)

  return entrypoint
}

function getBareExecutable() {
  const main = require.resolve('bare-sidecar')
  return require(joinModulePath(main, 'lib/bare.js'))
}

function joinModulePath(main, filename) {
  if (main.startsWith('bare:') || main.startsWith('/')) {
    return main.slice(0, main.lastIndexOf('/')) + '/' + filename
  }

  return path.join(path.dirname(main), filename)
}

function normalizeStdio(stdio) {
  if (Array.isArray(stdio)) stdio = [...stdio]
  else if (typeof stdio === 'string') stdio = [stdio, stdio, stdio]
  else stdio = ['pipe', 'pipe', 'pipe']

  if (!stdio.includes('ipc')) stdio.push('ipc')

  return stdio
}

function normalizeSpawnStdio(stdio, env, ipc) {
  if (os.platform() !== 'win32') return stdio

  const result = [...stdio]

  result[ipc] = 'overlapped'
  env.BARE_CHANNEL_FD = String(ipc)
  env.BARE_CHANNEL_SERIALIZATION_MODE = 'binary'

  return result
}

function normalizeEnv(env) {
  if (env) return { ...env }

  const result = {}

  for (const key of new Set(os.getEnvKeys())) {
    const value = os.getEnv(key)
    if (value !== undefined) result[key] = value
  }

  return result
}

function safeName(name) {
  return name.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-+/, '')
}
