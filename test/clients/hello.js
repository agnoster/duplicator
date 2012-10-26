var http = require('http')

function helloClient(port) {
  var opts = {
    method : 'GET',
    host : 'localhost',
    port : port,
    path : '/hello'
  }

  var req = http.request(opts, function (res) {
    var body = ''
    res.on('data', function(data) {
      body += data
      console.log(body)
    })

    res.on('end', function() {
      console.log('done')
      req.emit('done', {
        body: body,
        statusCode: res.statusCode,
        headers: res.headers
      })
    })
  })
  req.end()

  return req
}

module.exports = helloClient
