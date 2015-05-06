prerender-s3-cache-alt
=======================

Prerender plugin for AWS S3 caching, to be used with the prerender node application from https://github.com/prerender/prerender.


How to use
----------

In your local prerender project run:

    $ npm install prerender-s3-cache-alt --save
    
Then in the server.js that initializes the prerender:

    server.use(require('prerender-s3-cache-alt'));

Configuration
-------------

Follow the instructions for the default S3 plugin.

Remember to attach `AmazonS3FullAccess` policy to IAM user.