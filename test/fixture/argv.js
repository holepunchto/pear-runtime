Bare.IPC.on('data', () => {
  Bare.IPC.write(JSON.stringify(Bare.argv))
})
