# pear-runtime

> Embeddable Runtime library for [Pear](https://docs.pears.com) with P2P OTA updates, Bare workers and storage APIs

```sh
npm install pear-runtime
```

This module integrates Pear into JavaScript-based Desktop applications.

See [pear-mobile](https://github.com/holepunchto/pear-mobile) for Pear's embeddable runtime module for Mobile Devices.

## Quick Starts

### Electron

```sh
git clone https://github.com/holepunchto/hello-pear-electron
```

For end-to-end instructions from building to deploying with [Pear](https://docs.pears.com) see [hello-pear-electron](https://github.com/holepunchto/hello-pear-electron/) `README.md`.

### WebView

> Coming Soon

## Features

- Peer-to-Peer Over-the-Air (P2P OTA) updates
- Run workers in [Bare Runtime](https://github.com/holepunchto/bare)
- Application storage management

## API

#### `const runtime = new PearRuntime(...)`

TODO

#### `IPC <stream.Duplex> = runtime.run(path, args = [], opts = {})`

Start a [bare](https://github.com/holepunchto/bare) worker.
Returns a duplex stream, the `IPC` pipe.

In the worker, `Bare.IPC` is the other end of the pipe.

Worker stdio is available at `IPC.stdin`, `IPC.stdout` & `IPC.stderr`.

#### `runtime.storage`

Suggested storage folder for app storage.

#### `runtime.on('updating')`

Emitted when an update is in progress

#### `runtime.on('updated')`

Emitted when an update is done

#### `await runtime.applyUpdate()`

Apply the update. Only valid post `updated`. On next app restart the new update is in effect.

#### `await runtime.close()`

Shut it down. You should do this when closing your app for best performance.

## Making updates

VERY EXPERIMENTAL, MOST DEFINITELY WILL CHANGE.

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
