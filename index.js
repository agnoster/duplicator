var net = require('net')
  , BufferedStream = require('morestreams').BufferedStream

/**
 * Internal: Return a function that behaves like a net.connect to a given host
 */
function makeConnect(host) {
  return function(cb) {
    return net.connect(host, cb)
  }
}

/**
 * Internal: Parse a host definition
 *
 * host - may be defined in different ways, here are some valid hosts:
 *        'localhost', 'foo.net:80', { host: 'bar.org', port: 3000 }, 8080,
 *        { port: 8080}, function(cb){ return net.connect({ port: 8000 }, cb }
 *
 * Returns a function like net.connect(host, cb)
 */
function parseHost(host) {
  switch(typeof host) {
    case 'function':
      return host
    case 'number':
      return makeConnect(host)
    case 'string':
      // match will always succeed
      var match = host.match(/(.*)(:(\d+))?/)
      host = { host: match[1] }
      if (match[2]) host.port = parseInt(match[3], 10)
      return makeConnect(host)
    case 'object':
      return makeConnect(host)
    default:
      return host
  }
}

/**
 * Public: Create a new net.Server that can forward and duplicate incoming
 * connections.
 *
 * A server returned from duplicator() has two special methods:
 *
 * server.forward(host) - forward all traffic to host
 * server.duplicate(host, [rate]) - duplicate traffic to host at the given rate
 *
 * See below for how they work
 */
function duplicator(cb) {

  var forwardHost, duplicateHost, sampleRate

  /**
   * Internal: Connect to the given host, call the callback with the connection
   * if successful.
   */
  function connect(host, cb) {
    host = parseHost(host)

    var connection = host(function() {
      cb(null, connection)
    })

    connection.on('error', function(err) {
      cb(err)
    })
  }

  /**
   * Internal: Duplicate the client to the host
   */
  function duplicate(client, host) {
    // Create a paused BufferedStream and pipe the client in, so we don't
    // miss any events
    var buffer = new BufferedStream
    buffer.pause()
    client.pipe(buffer)

    // Connect to the duplicate host and pipe the buffer into it, discarding
    // the response
    connect(host, function(err, connection) {
      // Silently ignore errors duplicating the connection.
      if (err) return

      buffer.pipe(connection)
      buffer.resume()
    })
  }

  /**
   * Internal: Forward the client to the host
   */
  function forward(client, host) {
    // Create a paused BufferedStream and pipe the client in, so we don't
    // miss any events
    var buffer = new BufferedStream
    buffer.pause()
    client.pipe(buffer)

    // Connect to the forwardHost and pipe the buffer into it, piping the
    // response back to the original connection
    connect(host, function(err, connection) {
      // 
      if (err) {
        console.error("Error forwarding connection:", err)
        return
      }
      buffer.pipe(connection)
      buffer.resume()
      connection.pipe(client)
    })
  }

  /**
   * Internal: Handle an incoming connection from a client
   */
  function onConnect(client) {
    // if the user defined a callback, call that
    cb && cb(client, forward, duplicate)

    // forward to the forwardHost
    if (forwardHost) forward(client, forwardHost)

    // duplicate traffic to the duplicateHost
    if (duplicateHost) {
      var rate = sampleRate
      while (rate > 0) {
        if (Math.random() < rate) duplicate(client, duplicateHost)
        rate--
      }
    }
  }

  var server = net.createServer(onConnect)

  /**
   * Public: specify a host to forward all connections to
   *
   * host - specify a host to forward to be parsed by parseHost
   *
   * Returns the server for chaining
   */
  server.forward = function(host) {
    forwardHost = parseHost(host)
    return this
  }

  /**
   * Public: specify a host to forward all connections to
   *
   * host - specify a host to forward to be parsed by parseHost
   * rate - number of requests to duplicate per incoming request
   *        0   - duplicate no requests
   *        1   - duplicate each request once
   *        0.1 - duplicate 10% of incoming requests
   *        5   - send out 5 duplicates for each incoming request
   *        2.5 - send out 2 duplicates for each incoming request, with a 50%
   *              chance of sending out a third copy
   *
   * Returns the server for chaining
   */
  server.duplicate = function(host, rate) {
    duplicateHost = parseHost(host)
    sampleRate = rate || sampleRate || 1
    return this
  }

  return server
}

/**
 * Internal: Returns the version by parsing the package.json file. Memoize the
 * result, as this should never change during a running process.
 */
function getVersion() {
  if (!getVersion.v) {
    var packageFile = require('path').resolve(__filename, '../package.json')
    getVersion.v = JSON.parse(require('fs').readFileSync(packageFile)).version
  }
  return getVersion.v
}

/**
 * Public: duplicator.version returns the version of the package
 */
duplicator.__defineGetter__('version', getVersion)

module.exports = duplicator
