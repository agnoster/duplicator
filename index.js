var net = require('net')

// Return a function that behaves like a net.connect to a given host
function makeConnect(host) {
  return function(cb) {
    return net.connect(host, cb)
  }
}

function parseHost(host) {
  if ('number' === typeof host) {
    return makeConnect(host)
  }
  if ('string' === typeof host) {
    var match = host.match(/(.*)(:(\d+))/)
    if (match) {
      host = { host: match[1] }
      if (match[2]) host.port = parseInt(match[3], 10)
      return makeConnect(host)
    }
  }
  if ('object' === typeof host) {
    return makeConnect(host)
  }
  return host
}

function duplicator(cb) {

  var forwardHost, duplicateHost, sampleRate

  function duplicate(connection) {
    var duplicateConnection = duplicateHost(function() {
      connection.pipe(duplicateConnection)
    })
  }

  function forward(connection) {
    var forwardConnection = forwardHost(function() {
      connection.pipe(forwardConnection)
      forwardConnection.pipe(connection)
    })
  }

  function handler(connection) {
    // if the user defined a callback, call that
    cb && cb(connection)

    // forward to the forwardHost
    if (forwardHost) forward(connection)

    // duplicate traffic to the duplicateHost
    if (duplicateHost) {
      var rate = sampleRate
      while (rate > 0) {
        if (Math.random() < rate) duplicate(connection)
        rate--
      }
    }
  }

  var server = net.createServer(handler)

  server.forward = function(host) {
    forwardHost = parseHost(host)
    return this
  }

  server.duplicate = function(host, rate) {
    duplicateHost = parseHost(host)
    sampleRate = rate || sampleRate || 1
    return this
  }

  return server
}

function getVersion() {
  if (!getVersion.v) {
    var packageFile = require('path').resolve(__filename, '../package.json')
    getVersion.v = JSON.parse(require('fs').readFileSync(packageFile)).version
  }
  return getVersion.v
}

duplicator.__defineGetter__('version', getVersion)

module.exports = duplicator
