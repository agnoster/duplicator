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

  var origin = makeServer(onConnect, function (req, res) {
    // delay origin response so sink has a chance to interfere
    res.statusCode = 201
    res.setHeader('content-type', 'text/plain')
    res.end('hello world')
  })

  var log = []
  var sink = makeServer(onConnect, function (req, res) {
    log.push(req.url)
    res.statusCode = 404
    res.setHeader('content-type', 'text/html')
    res.end('PAY NO ATTENTION TO ME')
  })

  var proxy = duplicator()
    .forward({ port: origin.port })
    .duplicate({ port: sink.port })
  proxy.listen(proxy.port = randomPort(), onConnect)

  var servers = [origin, sink, proxy]
  var connected = 0

  function onConnect () {
    if (++connected < servers.length) return

    var opts = {
      method : 'GET',
      host : 'localhost',
      port : proxy.port,
      path : '/beep'
    }

    var req = http.request(opts, function (res) {
      t.equal(res.statusCode, 201, "got status code from origin")
      t.equal(res.headers['content-type'], 'text/plain', "got content-type from origin")

      var buffer = ''
      res.on('data', function(data) {
        buffer += data
      })

      res.on('end', function () {
        t.equal(buffer, 'hello world', "got body from origin")
        t.equal(log.length, 1, "sink intercepted a message")
        t.equal(log[0], '/beep', "sink got the right message")
        servers.forEach(function(server){
          server.close()
        })
        t.end()
      })
    })
    req.end()
  }
})
