'use strict'

const assert = require('assert')
const AWS = require('aws-sdk')
const fs = require('fs')

const S3ProxyStream = require('..')

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  params: {
    Bucket: process.env.S3_PROXY_STREAM_BUCKET,
  }
})

const proxy = S3ProxyStream(s3)
// test fixture
const Key = 's3-proxy-stream-package.json'

// upload a file
before(done => {
  s3.putObject({
    Key,
    Body: fs.readFileSync('package.json'),
  }, done)
})

describe('S3 Proxy Stream', () => {
  describe('when the file exists', () => {
    let headers

    it('should return a stream', () => {
      return proxy(Key).then(stream => {
        stream.resume()
        assert(stream.headers)

        Object.keys(stream.headers).forEach(key => {
          assert(!~key.indexOf('x-amz-'))
        })

        headers = stream.headers
        assert(!headers.date)
        assert(!headers.server)
        assert(!headers.connection)
      })
    })

    it('should support `if-none-match`', () => {
      return proxy(Key, {
        headers: {
          'if-none-match': headers.etag,
        }
      }).then(stream => {
        assert.equal(stream.status, 304)
        assert.equal(stream.statusCode, 304)
      })
    })

    it('should support `range`', () => {
      return proxy(Key, {
        headers: {
          range: 'bytes=0-1'
        }
      }).then(stream => {
        assert.equal(stream.status, 206)
      })
    })
  })

  describe('when the file does not exist', () => {
    it('should return an error', () => {
      return proxy('kljasldkfjalskjdfaklsjdf').then(() => {
        throw new Error('boom')
      }).catch(err => {
        assert(err instanceof Error)
        assert(err.message !== 'boom')
        assert.equal(err.status, 404)
        assert.equal(err.statusCode, 404)
        assert.equal(err.name, 'NoSuchKey')
      })
    })
  })
})
