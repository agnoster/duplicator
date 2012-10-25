# duplicator [![build status](https://secure.travis-ci.org/agnoster/duplicator.png?branch=master)](http://travis-ci.org/agnoster/duplicator)

> TCP proxy that also duplicates traffic to a secondary host

I built this because I needed a way to "tap" production traffic and shoot it at a new system to see how it handles load.

# usage (cli)

```
npm install -g duplicator
duplicator -f localhost:80 -d localhost:3000 -p 8080
```

* forward all traffic to localhost:80
* duplicate all traffic to localhost:3000, ignoring responses
* listen on port 8080

# usage (code)

The equivalent to the call above, in node.js:

```js
require('duplicator')()
  .forward('localhost:80')
  .duplicate('localhost:3000')
  .listen(8080)
```

# advanced

Alternatively, if you're more the manual transmission type, `duplicator` creates a pretty standard `net.Server`. You can pass a connection callback, and it will also receive functions to forward and duplicate connections.

```js
var duplicator = require('duplicator')

var server = duplicator(function(connection, forward, duplicate){
  forward({ host: 'localhost', port: 80 })
  duplicate({ host: 'localhost', port: 3000 })
}).listen(8080)
```

This allows you to be more specific about how you want to forward/duplicate connections. You could even load-balance either one, or only duplicate a certain number of requests per minute, or whatever. Note, however, that all calls to `forward` or `duplicate` **must** be called in the same tick, or data could be dropped to one of the destinations. (This is just how `Stream.pipe()` works, sorry).

## duplicator(cb)

Creates a new `net.Server` with two special properties:

* when `cb` is called on a successful connection, it will receive the connection to the client and two special callback functions, `forward` and `duplicate` (more on those below)
* two extra methods on the server, `forward` and `duplicate`, which cause the server to automatically invoke the corresponding callback function on every connection

In general, you should only use either the callbacks or the methods. However, you can combine them:

```js
duplicator(function(connection, forward, duplicate){
  var host = (Math.random() < 0.5) ? 'host1:80' : 'host2:80'
  duplicate(host)
}).forward('origin:80')
```

In this example, we always use `origin:80` as the primary server to forward requests to, but we send half the duplicated rquests to `host1`, and the other half to `host2`.

## callback: forward(host, [stream])

Forward `stream` to `host`. `stream` defaults to the current connection unless otherwise specified.

```js
duplicator(function(connection, forward, duplicate){
  // forward every connection to localhost:80
  forward('localhost:80')
})
```

Note that it is *not* safe to call `forward` multiple times on a connection, as the responses from the different servers may interfere with one another. Therefore if you do call `forward` multiple times, only the first will succeed, and subsequent calls will merely duplicate the connection.

## server.forward(host)

Convenience method to tell the server to call `forward(host)` on every connection.

```js
// forward every connection to localhost:80
duplicator().forward('localhost:80')
```

With `server.forward`, multiple calls will simply overwrite the previous forwarding server. This means you can actually change the forward server at runtime.

```js
var count = 0
var server = duplicator(function() {
  if (++count > 1000) server.forward('secondary:3000')
}).forward('primary:80')
```

This would forward to `primary` for the first 1000 requests, then switch to `secondary`.

## callback: duplicate(host, [stream], [rate])

Duplicate on average `rate` copies of `stream` to `host`. `stream` defaults to the current connection unless otherwise specified, `rate` defaults to 1.

Rate is the *expected* number of copies sent per connection, and is interpreted as follows:
  * 0.1 -> send once with 10% probability
  * 1 -> send exactly one copy
  * 5 -> send out 5 copies
  * 2.5 -> send out 2 copies, with a 50% chance of a third

Note that both `stream` and `rate` are optional, but have sensible defaults. If only two parameters are specified, the second will be interpreted as `rate` if it's a number, `stream` otherwise.

```js
duplicator(function(connection, forward, duplicate){
  // duplicate 50% of requests to localhost:3000
  duplicate('localhost:3000', 0.5)
})
```

## server.duplicate(host, [rate])

Convenience method to tell the server to call `duplicate(host, rate)` on every connection.

```js
// duplicate 50% of requests to localhost:3000
duplicator().duplicate('localhost:3000', 0.5)
```

As with `server.forward`, the last call sets the destination.

## specifying hosts

A host can be any one of:

* an object as `net.connect` would expect it (`{ host: 'google.com', port: 80 }`)
* a number representing a port (`80`, `3000`), host is implied to be `localhost`
* a string representing a host (`localhost:3000`, `google.com:80`)
* a function that behaves like `net.connect` (`function(cb) { net.connect({ port:80 }, cb) }`)

# mit license
