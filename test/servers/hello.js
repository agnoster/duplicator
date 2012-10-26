var http = require('http')

function helloServer(message) {
  var server = http.createServer(function(req, res) {
    res.setHeader('content-type', 'text/plain')
    if (req.url === '/hello' && req.method === 'GET') {
      return res.end(message)
    }
    res.statusCode = 404
    res.end('Not Found')
  })

  return server
}

module.exports = helloServer
