const http = require('http')
const url = require('url')
const queryString = require('querystring')

function express () {
  const middlewareStack = []

  function callMiddleware (i, req, res) {
    if (i >= middlewareStack.length) return

    function next () {
      callMiddleware(i + 1, req, res)
    }

    middlewareStack[i](req, res, next)
  }

  function httpHandler (method, pattern, callback) {
    middlewareStack.push(function (req, res, next) {
      if (
        req.pathname === pattern && req.method === method
      ) {
        callback(req, res)
      } else {
        next()
      }
    })
  }

  const server = http.createServer(function (req, res) {
    const parsedUrl = url.parse(req.url)

    req.pathname = parsedUrl.pathname
    req.query = queryString.parse(parsedUrl.query)

    res.send = res.end

    callMiddleware(0, req, res)

    res.send('fallthrough')
  })

  const app = {}

  app.listen = function (port, callback) {
    server.listen(port, callback)
  }

  app.use = function (callback) {
    middlewareStack.push(callback)
  }

  app.get = function (pattern, callback) {
    httpHandler('GET', pattern, callback)
  }

  app.post = function (pattern, callback) {
    httpHandler('POST', pattern, callback)
  }

  app.put = function (pattern, callback) {
    httpHandler('PUT', pattern, callback)
  }

  app.delete = function (pattern, callback) {
    httpHandler('DELETE', pattern, callback)
  }

  return app
}

module.exports = express
