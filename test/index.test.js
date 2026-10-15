const PearRuntime = require('..')
const test = require('brittle')
const path = require('path')
const { isBare } = require('which-runtime')
const Corestore = require('corestore')
const Hyperdrive = require('hyperdrive')
const fs = require(isBare ? 'bare-fs/promises' : 'fs/promises')
const b4a = require('b4a')

test('worker echo', (t) => {
  t.plan(2)

  const specifier = require.resolve('./fixture/echo.js')
  const IPC = PearRuntime.run(specifier)

  const s = 'hello world'

  IPC.on('data', (data) => {
    t.is(data.toString(), s)
    IPC.destroy()
  })
  IPC.on('close', () => {
    t.pass()
  })

  IPC.write(s)
})

test('worker argvs', async (t) => {
  t.plan(1)

  const specifier = require.resolve('./fixture/argv.js')
  const IPC = PearRuntime.run(specifier, ['test'])
  t.teardown(() => IPC.destroy())

  const message = once(IPC, 'data')
  IPC.write('ping')

  const argv = JSON.parse((await message).toString())

  t.alike(argv, [expectedArgv0(), specifier, 'test'])
})

test(
  'clear upgrade drive clears every version and preserves other storage',
  { timeout: 10000 },
  async (t) => {
    const source = await createDrive(t)
    await source.put('/runtime', b4a.from('old runtime'))
    const version = source.version
    await source.put('/runtime', b4a.from('new runtime'))
    const { runtime, store, dir } = await createRuntime(t, source.key)
    await runtime.ready()

    const disconnect = replicate(t, source.corestore, store)
    const drive = runtime.updater.drive
    await drive.core.download({ start: 0, end: source.core.length }).done()
    const blobs = await drive.getBlobs()
    await blobs.core.download({ start: 0, end: source.blobs.core.length }).done()
    disconnect()

    const unrelated = store.get({ name: 'unrelated' })
    await unrelated.append('keep core')
    const app = new Hyperdrive(store.namespace('app'))
    await app.put('/data', b4a.from('keep app'))
    t.teardown(() => app.close())

    const files = [
      path.join(runtime.storage, 'data'),
      path.join(dir, 'installed-app'),
      path.join(dir, 'pear-runtime', 'next', 'update', 'app')
    ]
    for (const file of files) {
      await fs.mkdir(path.dirname(file), { recursive: true })
      await fs.writeFile(file, 'keep file')
    }

    const metadataLength = drive.core.length
    const contentLength = blobs.core.length
    t.is(await cachedBlocks(drive.core), metadataLength)
    t.is(await cachedBlocks(blobs.core), contentLength)
    t.alike(await drive.checkout(version).get('/runtime'), b4a.from('old runtime'))

    await Promise.all([runtime.clearUpgradeDrive(), runtime.clearUpgradeDrive()])
    await runtime.clearUpgradeDrive()

    t.is(await cachedBlocks(drive.core), 0)
    t.is(await cachedBlocks(blobs.core), 0)
    t.is(drive.core.length, metadataLength)
    t.is(blobs.core.length, contentLength)
    t.alike(await unrelated.get(0), b4a.from('keep core'))
    t.alike(await app.get('/data'), b4a.from('keep app'))
    for (const file of files) t.is(await fs.readFile(file, 'utf8'), 'keep file')

    replicate(t, source.corestore, store)
    await drive.core.download({ start: 0, end: metadataLength }).done()
    await blobs.core.download({ start: 0, end: contentLength }).done()
    t.alike(await drive.get('/runtime'), b4a.from('new runtime'))
    t.alike(await drive.checkout(version).get('/runtime'), b4a.from('old runtime'))
  }
)

test('clear an empty upgrade drive waits for readiness offline', { timeout: 10000 }, async (t) => {
  const { runtime } = await createRuntime(t, b4a.alloc(32, 1))
  await runtime.clearUpgradeDrive()

  t.ok(runtime.opened)
  t.is(runtime.updater.drive.blobs, null)
  t.is(runtime.updater.drive.core.length, 0)
})

test(
  'clear cached content after reopening without metadata offline',
  { timeout: 10000 },
  async (t) => {
    const source = await createDrive(t)
    await source.put('/runtime', b4a.from('cached runtime'))
    const initial = await createRuntime(t, source.key)
    await initial.runtime.ready()
    const disconnect = replicate(t, source.corestore, initial.store)
    const drive = initial.runtime.updater.drive
    await drive.core.download({ start: 0, end: source.core.length }).done()
    t.alike(await drive.get('/runtime'), b4a.from('cached runtime'))
    disconnect()
    const contentKey = drive.contentKey
    const contentLength = drive.blobs.core.length
    await drive.core.clear(0, drive.core.length)
    await initial.runtime.close()
    await initial.store.close()

    const { runtime, store } = await createRuntime(t, source.key, initial.dir)
    await runtime.ready()
    const content = store.get({ key: contentKey })
    await content.ready()

    t.is(runtime.updater.drive.blobs, null)
    t.is(await cachedBlocks(content), contentLength)
    await runtime.clearUpgradeDrive()
    t.is(await cachedBlocks(content), 0)
    t.is(content.length, contentLength)
    t.is(await cachedBlocks(runtime.updater.drive.core), 0)
  }
)

async function createDrive(t) {
  const store = new Corestore(await t.tmp())
  const drive = new Hyperdrive(store)
  t.teardown(async () => {
    await drive.close()
    await store.close()
  })
  await drive.ready()
  return drive
}

async function createRuntime(t, key, dir) {
  if (!dir) dir = await t.tmp()
  const store = new Corestore(path.join(dir, 'pear-runtime', 'corestore'))
  const runtime = new PearRuntime({
    dir,
    upgrade: 'pear://' + key.toString('hex'),
    name: 'app',
    updates: false,
    store,
    swarm: {}
  })
  t.teardown(async () => {
    await runtime.close()
    await store.close()
  })
  return { runtime, store, dir }
}

function replicate(t, source, target) {
  const a = source.replicate(true)
  const b = target.replicate(false)
  a.pipe(b).pipe(a)
  const disconnect = () => {
    a.destroy()
    b.destroy()
  }
  t.teardown(disconnect)
  return disconnect
}

async function cachedBlocks(core) {
  let count = 0
  for (let i = 0; i < core.length; i++) {
    if (await core.has(i)) count++
  }
  return count
}

function expectedArgv0() {
  if (isBare) return require('bare-os').execPath()
  return require(path.join(path.dirname(require.resolve('bare-sidecar')), 'lib', 'bare'))
}

function once(emitter, event) {
  return new Promise((resolve, reject) => {
    emitter.once(event, resolve)
    emitter.once('error', reject)
  })
}
