const PearRuntime = require('..')
const test = require('brittle')
const path = require('path')
const { isBare } = require('which-runtime')
const Corestore = require('corestore')

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

test('clear upgrade drive', async (t) => {
  const runtime = await createRuntime(t)
  const cleared = { blocks: 2 }
  runtime.updater.drive.clearAll = () => Promise.resolve(cleared)

  t.is(await runtime.clearUpgradeDrive(), cleared)
})

test('clear upgrade drive propagates errors', async (t) => {
  const runtime = await createRuntime(t)
  const error = new Error('clear failed')
  runtime.updater.drive.clearAll = () => Promise.reject(error)

  await t.exception(runtime.clearUpgradeDrive(), error)
})

test('clear an empty upgrade drive', async (t) => {
  const runtime = await createRuntime(t)

  t.is(await runtime.clearUpgradeDrive(), null)
})

async function createRuntime(t) {
  const dir = await t.tmp()
  const store = new Corestore(dir)
  const runtime = new PearRuntime({
    dir,
    store,
    swarm: { destroy: () => Promise.resolve() },
    upgrade: 'pear://' + '01'.repeat(32),
    name: 'app',
    updates: false
  })
  t.teardown(async () => {
    await runtime.close()
    await store.close()
  })

  await runtime.ready()
  return runtime
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
