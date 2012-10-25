# duplicator [![build status](https://secure.travis-ci.org/agnoster/duplicator.png?branch=master)](http://travis-ci.org/agnoster/duplicator)

> TCP proxy that duplicates traffic to other host for testing

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

Alternatively, if you're more the manual transmission type, `duplicator` creates a pretty standard `net.Server`. You can pass a connection callback, and it will also receive function to forward and duplicate connections.

```js
var duplicator = require('duplicator')

var server = duplicator(function(connection, forward, duplicate){
  forward(connection, { host: 'localhost', port: 80 })
  duplicate(connection, { host: 'localhost', port: 3000 })
}).listen(8080)
```

This allows you to be more specific about how you want to forward/duplicate connections. You could even load-balance either one, or only duplicate a certain number of requests per minute, or whatever.

# mit license
