const PearRuntime = require('..')
const test = require('brittle')
const path = require('path')
const { isBare } = require('which-runtime')

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
