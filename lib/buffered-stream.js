// Adapted from https://github.com/felixge/node-passthrough-stream/

var Stream = require('stream').Stream
var util = require('util')

function BufferedStream() {
  this.writable = true
  this.readable = true
  this.paused = false
  this.buffer = []
}
util.inherits(BufferedStream, Stream)

BufferedStream.prototype.write = function(data) {
  this.emit('data', data)
}

BufferedStream.prototype.end = function() {
  this.emit('end')
}

BufferedStream.prototype.destroy = function() {
  this.emit('close')
}

BufferedStream.prototype.emit = function() {
  if (this.paused) {
    this.buffer.push(arguments)
  } else {
    this._emit.apply(this, arguments)
  }
}

BufferedStream.prototype._emit = function() {
  this.constructor.super_.prototype.emit.apply(this, arguments)
}

BufferedStream.prototype.pause = function() {
  this.paused = true
}

BufferedStream.prototype.resume = function() {
  this.paused = false
  this.flushBuffer()
}

BufferedStream.prototype.flushBuffer = function() {
  while (this.buffer.length > 0) {
    this._emit.apply(this, this.buffer.shift())
  }
}

module.exports = BufferedStream
