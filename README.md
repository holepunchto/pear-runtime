# pear-runtime

> Embeddable Runtime library for [Pear](https://docs.pears.com) with P2P OTA updates, Bare workers and storage APIs

```sh
npm install pear-runtime
```

This module integrates Pear into JavaScript-based Desktop applications.

See [pear-mobile](https://github.com/holepunchto/pear-mobile) for Pear's embeddable runtime module for Mobile Devices.

## MVP - EXPERIMENTAL

This library is MVP and Experimental.

## OS Support

- MacOS
- Linux
- Windows

## Usage

```js
const path = require('path')
const PearRuntime = require('pear-runtime')
const { version, upgrade } = require('./package.json')

function getAppPath() {
  if (!app.isPackaged) return null
  if (isLinux && process.env.APPIMAGE) return process.env.APPIMAGE
  if (isWindows) return process.execPath
  return path.join(process.resourcesPath, '..', '..')
}

const pear = new PearRuntime({
  dir: path.join(__dirname, 'runtime-data'),
  version,
  upgrade,
  app: getAppPath() // path to .app / .AppImage / .msix
})
pear.on('error', console.error) // log network errors etc.
pear.updater.on('updating', () => console.log('Updating...'))
pear.updater.on('updated', () => pear.updater.applyUpdate())

const worker = pear.run(require.resolve('./worker.js'))
worker.on('data', (data) => console.log('worker:', data.toString()))

// be sure to await pear.close() during process teardown
```

## Quick Starts

### Electron

```sh
git clone https://github.com/holepunchto/hello-pear-electron
```

For end-to-end instructions from building to deploying with [Pear](https://docs.pears.com) see [hello-pear-electron](https://github.com/holepunchto/hello-pear-electron/) `README.md`.

### WebView

> Coming Soon

## Features

- Peer-to-Peer Over-the-Air (P2P OTA) updates (via [pear-runtime-updater](https://www.github.com/holepunchto/pear-runtime-updater))
- Run workers in [Bare Runtime](https://github.com/holepunchto/bare)
- Application storage management

## API

#### `const pear = new PearRuntime(opts)`

- `opts.dir` – (required) Directory to store data (e.g. app data dir).
- `opts.upgrade` – (required) Pear upgrade link (e.g. from `package.json` `upgrade` field).
- `opts.name` - (required) The package.json `productName` of the app.
- **`store`** - (optional) pass a [Corestore](https://github.com/holepunchto/corestore) to be used for updates. If passed `swarm` must also be passed. The `store` should be replicated over the `swarm`.
- **`swarm`** - (optional) pass a [Hyperswarm](https://github.com/holepunchto/hyperswarm) to be used for swarming updates. If passed `store` must also be passed. The `store` should be replicated over the `swarm`.
- `opts.version` – (optional) Current app version; used to decide if an update should be stored.
- `opts.app` – (optional) Path to the app bundle (for bundled apps; used with `applyUpdate()`).
- `opts.bundled` – (optional) Whether the app is bundled. Defaults to `!!opts.app`.
- `opts.updates` – (optional) Set to false to opt out of updates.
- `opts.storage` – (optional) Set peer-to-peer application storage path.

#### `IPC <stream.Duplex> = pear.run(path, args = [], opts = {})`

Start a [bare](https://github.com/holepunchto/bare) worker.
Returns a duplex stream, the `IPC` pipe.

In the worker, `Bare.IPC` is the other end of the pipe.

Worker stdio is available at `IPC.stdin`, `IPC.stdout` & `IPC.stderr`.

#### `pear.storage`

Suggested storage folder for app storage.

#### `await pear.ready()`

Resolves when ready. Initialization is eager, but can be used to determine when OTA updates are ready.

#### `await pear.close()`

Shut down the embedded runtime, including OTA updates. For best performance, be sure to do this when closing the app.

## Making updates

VERY EXPERIMENTAL, MOST DEFINITELY WILL CHANGE.

Update listening and apply logic lives in [pear-runtime-updater](https://www.github.com/holepunchto/pear-runtime-updater).

First allocate a pear link if you haven't using [`pear`](https://github.com/holepunchto/pear):

```sh
pear touch
```

Store this link in the `package.json` `upgrade` field of a project. See [example](./example/package.json).

Build an app. Take the distributable (e.g .app) produced and make a deployment folder with the following structure:

```
/package.json
/by-arch
  /[...platform-arch]
    /app
```

Now go to this folder and stage this onto the link with `pear stage`

```sh
pear stage {link-from-touch}
```

Now seed it. Any build out there on a lower version will trigger the update flow.

## LICENSE

Apache-2.0
