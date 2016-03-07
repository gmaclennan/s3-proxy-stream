
# s3-proxy-stream

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][codecov-image]][codecov-url]
[![Dependency Status][david-image]][david-url]
[![License][license-image]][license-url]
[![Downloads][downloads-image]][downloads-url]

Simplified `s3.getObject()` designed for proxying.

## API

### const get = require('s3-proxy-stream')(s3, options)

```js
const s3 = new AWS.S3({
  // access keys and stuff
  params: {
    Bucket: 'my-bucket', // whichever bucket you are using
  }
})

const get = require('s3-proxy-stream')(s3, {
  // default `s3.getObject()` params
  // you can also set `Bucket` here
  Bucket: 'my-bucket',
})
```

All `options` are defaults for every request.

### get(key, [options]).then(stream => {}).catch(err => {})

Get an object at `key`.
`options` is passed to `s3.getObject()`, except we have an extra field called `.headers`.
Simply pass `request.headers` and the appropriate `s3.getObject()` params will be set.

```js
app.use((req, res, next) => {
  get(req.path, {
    headers: req.headers,
  })
  .then(stream => {
    // set the status code
    res.statusCode = stream.statusCode

    // set the headers
    for (const key of stream.headers) {
      res.setHeader(key, stream.headers[key])
    }

    // no body to pipe
    if (res.statusCode === 304) return

    // pipe the response
    stream.on('error', next).pipe(res)
  })
  // handle errors
  .catch(next)
})
```

#### stream

The stream has the following properties:

- `.status` and `.statusCode` - the status code of the response
- `.headers` - headers of the response

#### error

The error has the following properties:

- `.status` and `.statusCode` - the status code of the response

[npm-image]: https://img.shields.io/npm/v/s3-proxy-stream.svg?style=flat-square
[npm-url]: https://npmjs.org/package/s3-proxy-stream
[travis-image]: https://img.shields.io/travis/jonathanong/s3-proxy-stream/master.svg?style=flat-square
[travis-url]: https://travis-ci.org/jonathanong/s3-proxy-stream
[codecov-image]: https://img.shields.io/codecov/c/github/jonathanong/s3-proxy-stream/master.svg?style=flat-square
[codecov-url]: https://codecov.io/github/jonathanong/s3-proxy-stream
[david-image]: http://img.shields.io/david/jonathanong/s3-proxy-stream.svg?style=flat-square
[david-url]: https://david-dm.org/jonathanong/s3-proxy-stream
[license-image]: http://img.shields.io/npm/l/s3-proxy-stream.svg?style=flat-square
[license-url]: LICENSE
[downloads-image]: http://img.shields.io/npm/dm/s3-proxy-stream.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/s3-proxy-stream
