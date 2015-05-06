var cache_manager = require('cache-manager');
var s3 = new(require('aws-sdk')).S3({
    params: {
        Bucket: process.env.S3_BUCKET_NAME
    }
});
var url = require('url');

module.exports = {
    init: function() {
        this.cache = cache_manager.caching({
            store: s3_cache
        });
    },

    beforePhantomRequest: function(req, res, next) {
        if (req.method !== 'GET') {
            return next();
        }

        var _url = url.parse(req.prerender.url),
            _key = _url.protocol + '/' + _url.hostname + _url.pathname + (_url.search || '') + (_url.hash || '');

        _key += _key[_key.length - 1] === '/' ? 'index.html' : '.html';

        if (_url.protocol === null) {
            return next();
        }

        this.cache.get(_key, function(err, result) {
            if (!err && result) {
                console.log('cache hit');
                res.send(200, result.Body);
            } else {
                next();
            }
        });
    },

    afterPhantomRequest: function(req, res, next) {
        var _url = url.parse(req.prerender.url),
            _key = _url.protocol + '/' + _url.hostname + _url.pathname + (_url.search || '') + (_url.hash || '');

        _key += _key[_key.length - 1] === '/' ? 'index.html' : '.html';

        if (_url.protocol === null) {
            return next();
        }

        this.cache.set(_key, req.prerender.documentHTML);
        next();
    }
};


var s3_cache = {
    get: function(key, callback) {
        if (process.env.S3_PREFIX_KEY) {
            key = process.env.S3_PREFIX_KEY + '/' + key;
        }

        s3.getObject({
            Key: key
        }, callback);
    },
    set: function(key, value, callback) {
        if (process.env.S3_PREFIX_KEY) {
            key = process.env.S3_PREFIX_KEY + '/' + key;
        }

        var request = s3.putObject({
            Key: key,
            ContentType: 'text/html;charset=UTF-8',
            StorageClass: 'REDUCED_REDUNDANCY',
            Body: value
        }, callback);

        if (!callback) {
            request.send();
        }
    }
};
