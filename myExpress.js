const http = require('http')
const url = require('url')
const queryString = require('querystring')
const fs = require('fs')

function express () {
  const middlewareStack = []

  function callMiddleware (middlewareIndex, req, res) {
    if (middlewareIndex >= middlewareStack.length) return

    function next () {
      callMiddleware(middlewareIndex + 1, req, res)
    }

    middlewareStack[middlewareIndex](req, res, next)
  }

  function httpHandler (method, pattern, callback) {
    let paramNames = pattern.match(/:\w+/g)

    if (paramNames) {
      paramNames = paramNames.map(param => param.slice(1))
    }

    const regex = RegExp(
      pattern
        .replace(/[^:\w]/g, '\\$&')
        .replace(/:\w+/g, '(\\w+)')
        .replace(/.+/, '^$&$'),
      'g'
    )

    middlewareStack.push(function (req, res, next) {
      const match = regex.exec(req.path)

      if ( match && req.method === method ) {

        if (paramNames) {
          req.params = {}
          paramNames.forEach((paramName, index) => {
            req.params[paramName] = match[index + 1]
          })
        }

        callback(req, res)
      } else {
        next()
      }
    })
  }

  const server = http.createServer(function (req, res) {
    const parsedUrl = url.parse(req.url)

    req.path = parsedUrl.pathname
    req.query = queryString.parse(parsedUrl.query)

    res.status = function (code) {
      res.statusCode = code
      return res
    }

    res.json = function (data) {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify(data))
    }

    res.send = res.end

    res.set = function (field, value) {
      res.setHeader(field, value)
    }

    res.type = function (contentType) {
      res.setHeader('Content-Type', contentType)
    }

    res.sendFile = function (filePath) {
      res.setHeader('Content-Type', 'text/html')

      fs.readFile(filePath, function (err, contents) {
        res.end(contents)
      })
    }

    callMiddleware(0, req, res)
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
