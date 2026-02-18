const path = require('path')
const fs = require('fs')
const fsx = require('fs-native-extensions')
const PearRuntimeUpdater = require('pear-runtime-updater')
const Sidecar = require('bare-sidecar')
const { platform, arch } = require('which-runtime')
const host = platform + '-' + arch

module.exports = class PearRuntime extends PearRuntimeUpdater {
  constructor(config) {
    if (!!config.update && config.updates !== false) super({ updates: true, ...config })
    if (!config.dir) throw new Error('dir required')

    this.dir = config.dir
    this.storage = path.join(this.dir, 'app-storage')
    this.app = config.app
    this.name = this.app && path.basename(this.app)
    this.bundled = config.bundled || !!this.app
  }

  run(entrypoint, args = [], opts = {}) {
    return new Sidecar(entrypoint, args, opts)
  }

  async applyUpdate() {
    if (!this.updated || this.applied || !this.bundled) return
    this.applied = true

    // mac only for now, linux similar, windows, more pain
    await fsx.swap(path.join(this.next, 'by-arch', host, 'app', this.name), this.app)
    await fs.promises.rm(this.next, { recursive: true, force: true })
  }
}
