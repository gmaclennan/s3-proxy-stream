'use strict'

const debug = require('debug')('s3-proxy-stream')
const Promise = require('any-promise')

const REQUEST_HEADER_MAP = {
  'if-match': 'IfMatch',
  'if-modified-since': 'IfModifiedSince',
  'if-none-match': 'IfNoneMatch',
  'if-unmodified-since': 'IfUnmodifiedSince',
  range: 'Range',
}

module.exports = function S3ProxyStream (s3, default_options) {
  default_options = default_options || {}

  return (Key, request_options) => {
    request_options = request_options || {}

    // request options
    const options = Object.assign({
      Key,
    }, default_options)

    // set request headers
    const requestHeaders = request_options.headers
    if (requestHeaders) {
      for (const field of Object.keys(requestHeaders)) {
        const mapped_field = REQUEST_HEADER_MAP[field]
        if (mapped_field) options[mapped_field] = requestHeaders[field]
      }

      // causes bugs if you leave this here
      delete request_options.headers
    }

    // request options overwrites headers
    Object.assign(options, request_options)

    debug('request headers: %o', requestHeaders)
    debug('getObject() options: %o', options)

    return new Promise((resolve, reject) => {
      const req = s3.getObject(options)
      const stream = req.createReadStream()

      // only pull when it succeeds
      req.on('success', response => {
        const httpResponse = response.httpResponse
        const status = httpResponse.statusCode
        const headers = httpResponse.headers
        debug('status: %s', status)
        debug('headers: %o', headers)

        stream.statusCode = stream.status = status
        stream.headers = filterS3ResponseHeaders(headers)
        resolve(stream)
      })

      // errors are emitted on the stream, thankfully
      stream.on('error', err => {
        debug('stream error: %o', err)
        if (err.statusCode < 400) {
          stream.resume()
          stream.status = stream.statusCode = err.statusCode
          stream.headers = {} // wtf AWS? y u no return headers?
          stream.error = err
          resolve(stream)
          return
        }

        err.status = err.statusCode
        reject(err)
      })
    })
  }
}

function filterS3ResponseHeaders (headers) {
  const out = {}

  for (const field of Object.keys(headers)) {
    if (field === 'date') continue // let this server set the date
    if (field === 'server') continue // sending `server: AmazonS3` messes with CloudFront
    if (field === 'connection') continue // let this server handle it
    if (/^x-amz-/.test(field)) continue // don't send aws headers

    out[field] = headers[field]
  }

  return out
}
