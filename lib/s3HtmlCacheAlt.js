const url = require('url');
const cacheManager = require('cache-manager');
const s3 = new (require('aws-sdk')).S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  params: {
    Bucket: process.env.S3_BUCKET_NAME,
  },
});

const s3Cache = {
  get(key, callback) {
    if (process.env.S3_PREFIX_KEY) {
      key = `${process.env.S3_PREFIX_KEY}/${key}`;
    }

    s3.getObject({
      Key: key,
    }, callback);
  },
  set(key, value, callback) {
    if (process.env.S3_PREFIX_KEY) {
      key = `${process.env.S3_PREFIX_KEY}/${key}`;
    }

    const request = s3.putObject({
      Key: key,
      ACL: 'public-read', // Requires `AmazonS3FullAccess` policy attached to IAM user.
      StorageClass: 'REDUCED_REDUNDANCY',
      ContentType: 'text/html;charset=UTF-8',
      Body: value,
    }, callback);

    if (!callback) {
      request.send();
    }
  },
};

module.exports = {
  init() {
    this.cache = cacheManager.caching({
      store: s3Cache,
    });
  },

  beforePhantomRequest(req, res, next) {
    if (req.method !== 'GET') {
      return next();
    }

    const requestUrl = url.parse(req.prerender.url);

    let key = `${requestUrl.protocol}/${requestUrl.hostname}${requestUrl.pathname}${requestUrl.search || ''}${requestUrl.hash || ''}`;
    key += key[key.length - 1] === '/' ? 'index.html' : '.html';

    if (requestUrl.protocol === null) {
      return next();
    }

    this.cache.get(key, (error, result) => {
      if (error) {
        console.error('cache error', error.message, key);
      }

      if (!error && result) {
        console.log('cache hit', key);
        res.send(200, result.Body);
        return;
      }

      next();
    });
  },

  afterPhantomRequest(req, res, next) {
    const requestUrl = url.parse(req.prerender.url);

    let key = `${requestUrl.protocol}/${requestUrl.hostname}${requestUrl.pathname}${requestUrl.search || ''}${requestUrl.hash || ''}`;
    key += key[key.length - 1] === '/' ? 'index.html' : '.html';

    if (requestUrl.protocol === null) {
      next();
      return;
    }

    this.cache.set(key, req.prerender.documentHTML, (error, result) => {
      if (error) {
        console.log(error);
      }
    });

    next();
  },
};
