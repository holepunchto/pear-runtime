# pear-runtime

Embeddable Pear runtime that gives you P2P OTA updates, bare workers and storage
APIs inside any JS (non-browser) based app

```sh
npm install pear-runtime
```

## API

#### `const runtime = new PearRuntime(...)`

TODO

#### `const IPC <stream.Duplex> = runtime.run(path, args = [], opts = {})`

Start a bare worker. IPC is a duplex stream.
Stdio is available at IPC.stdin, IPC.stdout, IPC.stderr.

`Bare.IPC` to access stream in child.

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

First allocate a key if you havent. With `pear` cli

```
pear touch
```

Store this key in `pear.json` in your project. See example for how it should look.
Set a version also, first version can be any number but `0` is good.

Build your electron app. Take the .app produced and make a folder that looks like this

```
pear.json # same one from your app build
my-app.app # app name should be the same as the app name you distribute
```

Now go to this folder and stage this onto your key with `pear stage`

```
pear stage pear://{key-from-touch}
```

Now seed it. Any build out there on a lower version will trigger the update flow

## LICENSE

Apache-2.0
