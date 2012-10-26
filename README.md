# duplicator [![build status](https://secure.travis-ci.org/agnoster/duplicator.png?branch=master)](http://travis-ci.org/agnoster/duplicator)

> TCP proxy that also duplicates traffic to a secondary host

I built this because I needed a way to "tap" production traffic and shoot it at a new system to see how it handles load.

# usage (cli)

```
npm install -g duplicator
duplicator -f localhost:80 -d localhost:3000 -p 8080
```

* forward all traffic to `localhost:80`
* duplicate all traffic to `localhost:3000`, ignoring responses
* listen on port `8080`

Note: the cli automatically uses the cluster API to run several workers to handle connections, and restart workers if they die.

# usage (code)

The equivalent to the call above, in node.js:

```js
var duplicator = require('duplicator')

var server = duplicator(function(connection, forward, duplicate) {
  forward('localhost:80')
  duplicate('localhost:3000')
}).listen(8080)
```

# reference

## duplicator(cb)

Creates a new `net.Server`. When `cb` is called on a successful connection, it will receive the connection to the client and two special callback functions, `forward` and `duplicate`.

```js
duplicator(function(connection, forward, duplicate) {
  forward('origin:80')
  duplicate(Math.random() < 0.5 ? 'host1:80' : 'host2:80')
})
```

In this example, we always use `origin:80` as the primary server to forward requests to, but we send half the duplicated rquests to `host1`, and the other half to `host2`.

## forward(host, [stream])

Forward `stream` to `host`. `stream` defaults to the current connection unless otherwise specified.

```js
duplicator(function(connection, forward, duplicate) {
  // forward every connection to localhost:80
  forward('localhost:80')
})
```

Note that it is *not* safe to forward the same connection multiple times, as the responses from the different servers may interfere with one another. Therefore if you do call `forward` multiple times, only the first call will succeed, and subsequent calls will merely duplicate the connection.

## duplicate(host, [stream], [rate])

Duplicate on average `rate` copies of `stream` to `host`. `stream` defaults to the current connection unless otherwise specified, `rate` defaults to 1.

Rate is the *expected* number of copies sent per connection, and is interpreted as follows:
  * 0.1 -> send once with 10% probability
  * 1 -> send exactly one copy
  * 5 -> send out 5 copies
  * 2.5 -> send out 2 copies, with a 50% chance of a third

Note that both `stream` and `rate` are optional, but have sensible defaults. If only two parameters are specified, the second will be interpreted as `rate` if it's a number, `stream` otherwise.

```js
duplicator(function(connection, forward, duplicate) {
  // duplicate 50% of requests to localhost:3000
  duplicate('localhost:3000', 0.5)
  // duplicate all connections to stdout
  duplicate('localhost:3000', process.stdout)
})
```

## specifying hosts

A host can be any one of:

* an object as `net.connect` would expect it (`{ host: 'google.com', port: 80 }`)
* a number representing a port (`80`, `3000`), host is implied to be `localhost`
* a string representing a host (`localhost:3000`, `google.com:80`)
* a function that behaves like `net.connect` (`function(cb) { net.connect({ port:80 }, cb) }`)

# contributing and attribution

Thanks to @netroy for contributing the cluster support!

If you'd like to contribute, please open a pull request or file an issue.

# mit license
