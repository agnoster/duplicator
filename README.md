# duplicator

> HTTP proxy that duplicates traffic to other host for testing

I built this because I needed a way to "tap" production traffic and shoot it at a new system to see how it handles load.

Duplicator is meant to be used with substack's [bouncy][].

# usage (cli)

```
npm install -g duplicator
duplicator localhost:80 -l 8080 -d localhost:3000
```

* act as a proxy for localhost:80
* listen on port 8080
* duplicate all traffic to localhost:3000 and throw the result away

# usage (code)

The equivalent to the call above, in node.js:

```js
var duplicator = require('duplicator')
  , bouncy = duplicator.bouncy

bouncy(function(req, bounce) {
  bounce('localhost:80')
  duplicator(bounce, 'localhost:3000')
}).listen(8080)
```

# mit license

[bouncy]: https://github.com/substack/bouncy "bounce HTTP requests around for load balancing or as an HTTP host router"
