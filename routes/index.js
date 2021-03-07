var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Upload and Delete Image in Amazon S3 Bucket using Node.js' });
});

module.exports = router;
