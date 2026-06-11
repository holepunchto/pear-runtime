const PearRuntime = require('..')
const test = require('brittle')
const path = require('path')

test('worker echo', (t) => {
  t.plan(2)

  const worker = PearRuntime.run(path.join(__dirname, 'fixture', 'worker.js'))

  const s = 'hello world'

  worker.on('data', (data) => {
    t.is(data.toString(), s)
    worker.destroy()
  })
  worker.on('close', () => {
    t.pass()
  })

  worker.write(s)
})
