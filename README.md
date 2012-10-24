# duplicator

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

# mit license
