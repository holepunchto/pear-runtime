# pear-runtime

Embeddable Pear runtime that gives you P2P OTA updates, bare workers and storage
APIs inside any JS (non-browser) based app

```sh
npm install pear-runtime
```

## API

#### `const runtime = new PearRuntime(...)`

TODO

#### `worker = runtime.run(path)`

Start a bare worker. Worker is a duplex stream.
Stdio is available at worker.stdin, worker.stdout, worker.stderr.

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

## LICENSE

Apache-2.0
