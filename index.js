var net = require('net')
  , BufferedStream = require('morestreams').BufferedStream

var ERR_MSG =
  { MULTIPLE_FWD:
    "Cowardly refusing to forward a connection to multiple destinations. " +
    "Using `duplicate` instead."
  , FWD_CONN_ERROR:
    "Error connection to forward host:"
  }

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
      var parts = host.split(':')
      host = { host: parts[0] }
      if (parts[1]) host.port = parseInt(parts[1], 10)
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
   * Internal: Pipe the client to a new host
   *
   * client          - a net.Socket stream
   * host            - something that parseHost can understand
   * forwardResponse - bool, do we forward the response from the host to the
   *                   client?
   *
   * Returns nothing
   */
  function pipe(client, host, forwardResponse) {
    // Create a paused BufferedStream and pipe the client in, so we don't
    // miss any events
    var buffer = new BufferedStream
    buffer.pause()
    client.pipe(buffer)

    // Connect to the host and pipe the buffer into it, piping the response
    // back to the original connection if forwardResponse is truthy
    connect(host, function(err, connection) {
      if (err) {
        if (forwardResponse) console.error(ERR_MSG.FWD_CONN_ERROR, err)
        buffer.close()
        client.close()
        return
      }
      if (forwardResponse) connection.pipe(client)
      buffer.pipe(connection)
      buffer.resume()
    })
  }

  /**
   * Internal: Handle an incoming connection from a client
   */
  function onConnect(client) {

    // Has this connection already been forwarded?
    var wasConnectionForwarded = false

    /**
     * Public: Forward the stream to a host, sending the response back to the
     * stream
     *
     * host   - a host that parseHost can understand
     * stream - a stream to forward, defaults to the incoming client connection
     */
    function forward(host, stream) {
      if (wasConnectionForwarded) {
        console.error(ERR_MSG.MULTIPLE_FWD)
        pipe(stream || client, host, false)
      } else {
        pipe(stream || client, host, wasConnectionForwarded = true)
      }
    }

    /**
     * Public: Duplicate the stream to a host, ignoring the response
     *
     * host   - a host that parseHost can understand
     * stream - a stream to forward, defaults to the incoming client connection
     * rate   - how many times should each connection be duplicated on average
     */
    function duplicate(host, stream, rate) {
      if (typeof rate === 'undefined') {
        if (typeof stream === 'number') {
          rate = stream
          stream = null
        } else {
          rate = 1
        }
      }

      stream = stream || client
      for (; rate >= 1; rate--) pipe(stream, duplicateHost)
      if (Math.random() < rate) pipe(stream, duplicateHost)
    }

    // if the user defined a callback, call that
    cb && cb(client, forward, duplicate)

    // forward to the forwardHost
    if (forwardHost) forward(forwardHost)

    // duplicate traffic to the duplicateHost
    if (duplicateHost) duplicate(duplicateHost, sampleRate)
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
