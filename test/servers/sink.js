var http = require('http')

function sinkServer() {
  var log = []

  var server = http.createServer(function(req, res) {
    log.push(req.url)
    res.setHeader('content-type', 'application/json')
    res.statusCode = 401
    res.end('{ "logged": ' + JSON.stringify(req.url) + ' }')
  })

  server.log = log

  return server
}

module.exports = sinkServer

