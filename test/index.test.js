var test = require('tap').test
  , http = require('http')
  , net = require('net')
  , duplicator = require('../')

function randomPort() {
  return Math.floor(Math.random() * (Math.pow(2,16) - 1e4) + 1e4)
}

function makeServer(connect, fn) {
  var server = http.createServer(fn)
  server.port = randomPort()
  server.listen(server.port, connect)
  return server
}

test('duplicator', function (t) {

  var origin = makeServer(connect, function (req, res) {
    res.setHeader('content-type', 'text/plain')
    res.end('hello world')
  })

  var sink = makeServer(connect, function (req, res) {
    sink.log.push(req)
  })
  sink.log = []

  var proxy = makeServer(connect, function (req, res) {
    var stream = net.createConnection(origin.port)
    bounce(stream)
  })

  var servers = [origin, sink, proxy]

  var connected = 0
  function connect () {
    if (++connected < servers.length) return

    var opts = {
      method : 'GET',
      host : 'localhost',
      port : proxy.port,
      path : '/beep'
    }

    var req = http.request(opts, function (res) {
      t.equal(res.statusCode, 200)
      t.equal(res.headers['content-type'], 'text/plain')

      res.on('end', function () {
        t.equal(sink.log, [])
        servers.forEach(function(server){
          server.close()
        })
        t.end()
      })
    })
    req.end()
  }
})
