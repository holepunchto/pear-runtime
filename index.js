const Hyperswarm = require('hyperswarm')
const Hyperdrive = require('hyperdrive')
const Localdrive = require('localdrive')
const Corestore = require('corestore')
const path = require('path')
const fs = require('fs')
const fsx = require('fs-native-extensions')
const ReadyResource = require('ready-resource')

module.exports = class PearContainer extends ReadyResource {
  constructor(config) {
    super()

    const dir = config.dir || '/tmp/pear-container/my-app'

    this.dir = dir
    this.version = config.version || 0
    this.storage = path.join(dir, 'app-storage')
    this.app = config.app
    this.name = this.app && path.basename(this.app)
    this.key = config.key
    this.length = config.length
    this.fork = config.fork || 0
    this.link = 'pear://' + this.key + '.' + this.fork + '.' + this.length
    this.bundled = config.bundled || !!this.app
    this.store = config.store || new Corestore(path.join(dir, 'corestore'))
    this.drive = new Hyperdrive(this.store, this.key)
    this.swarm = config.swarm || null
    this.next = null
    this.checkout = null

    this.updating = false
    this.updated = false
    this.applied = false

    this.ready().catch(noop)
  }

  async _open() {
    await this.drive.ready()

    if (this.bundled) {
      await fs.promises.rm(path.join(this.dir, 'next'), { recursive: true, force: true })

      if (!this.swarm) {
        const keyPair = await this.store.createKeyPair('pear-container')
        this.swarm = new Hyperswarm({ keyPair })
      }

      this.swarm.on('connection', connection => this.store.replicate(connection))
      this.swarm.join(this.drive.core.discoveryKey, { client: true, server: false })

      if (this.updateable()) this._updateBackground()

      this.drive.core.on('append', () => this._updateBackground())
    }
  }

  async _close() {
    await this.drive.close()
    if (this.checkout) await this.checkout.close()
    await this.store.destroy()
    await this.swarm.destroy()
  }

  updateable() {
    return this.drive.core.length > this.length
  }

  async apply() {
    if (!this.updated || this.applied || !this.bundled) return
    this.applied = true

    // mac only for now, linux similar, windows, more pain
    await fsx.swap(path.join(this.next, this.name), this.app)
    await fs.promises.rm(this.next, { recursive: true, force: true })
  }

  _updateBackground() {
    this._update().catch(noop)
  }

  async _update() {
    if (this.updating) return
    if (this.drive.core.length <= this.length) return

    this.updating = true

    const length = this.drive.core.length
    const id = length + '.' + this.drive.core.fork
    const next = path.join(this.dir, 'next', id)
    const co = this.drive.checkout(length)

    this.checkout = co

    const manifest = await co.get('/pear.json')
    if (!manifest || JSON.parse(manifest).version <= this.version) {
      this.updating = false
      this.checkout = null
      await co.close()
    }

    const local = new Localdrive(next)

    this.emit('updating')

    for await (const data of co.mirror(local)) {
      this.emit('updating-delta', data)
    }

    await co.close()
    await local.close()

    this.checkout = null
    this.length = length
    this.next = next

    this.updating = false
    this.updated = true
    this.emit('updated')

    if (this.updateable()) this._updateBackground()
  }
}

function noop () {}
