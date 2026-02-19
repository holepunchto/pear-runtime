# pear-runtime

> Embeddable Runtime library for [Pear](https://docs.pears.com) with P2P OTA updates, Bare workers and storage APIs

```sh
npm install pear-runtime
```

This module integrates Pear into JavaScript-based Desktop applications.

See [pear-mobile](https://github.com/holepunchto/pear-mobile) for Pear's embeddable runtime module for Mobile Devices.

## MVP - EXPERIMENTAL

This boilerplate is MVP and Experimental.

## OS Support

- MacOS
- Linux - Work in Progress
- Windows - Work in Progress

## Usage

```js
const path = require('path')
const PearRuntime = require('pear-runtime')
const { version, upgrade } = require('./package.json')

function getApp() {
  return path.join(process.resourcesPath, '../..')
}

const runtime = new PearRuntime({
  dir: path.join(__dirname, 'runtime-data'),
  version,
  upgrade,
  app: getApp() // path to .app / .AppImage
})

runtime.on('updating', () => console.log('Updating...'))
runtime.on('updated', () => runtime.applyUpdate())


const worker = runtime.run(require.resolve('./worker.js'))
worker.on('data', (data) => console.log('worker:', data.toString()))

process.on('beforeExit', async () => await runtime.close())
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
- `opts.version` – (optional) Current app version; used to decide if an update should be stored.
- `opts.app` – (optional) Path to the app bundle (for bundled apps; used with `applyUpdate()`).
- `opts.bundled` – (optional) Whether the app is bundled. Defaults to `!!opts.app`.
- `opts.updates` – (optional) Set to false to opt out of updates.

#### `IPC <stream.Duplex> = pear.run(path, args = [], opts = {})`

Start a [bare](https://github.com/holepunchto/bare) worker.
Returns a duplex stream, the `IPC` pipe.

In the worker, `Bare.IPC` is the other end of the pipe.

Worker stdio is available at `IPC.stdin`, `IPC.stdout` & `IPC.stderr`.

#### `pear.storage`

Suggested storage folder for app storage.

#### `await pear.close()`

Shut it down (including the updater). You should do this when closing your app for best performance.

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
  /app
    /[...platform-arch]
```

Now go to this folder and stage this onto the link with `pear stage`

```sh
pear stage {link-from-touch}
```

Now seed it. Any build out there on a lower version will trigger the update flow.

## LICENSE

Apache-2.0
