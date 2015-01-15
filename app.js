var express = require('express');
var fs = require('fs');
var logger = require('morgan');
var path = require('path');
var multer = require('multer');
var bodyParser = require('body-parser');
var fs = require('fs');
var mongoose = require('mongoose');

var File = mongoose.model('File', {
  filename: String,
  timestamp: Number,
  last_update: String,
  deleted: Boolean
});

mongoose.connect('mongodb://darkbtf:jizz1234@ds031631.mongolab.com:31631/mybox');

var fileList = {};

var timestamp = 0;

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function (callback) {
  console.log('database server is ready.');
  File.find({}, function(err, docs) {
      for (var i = 0; i < docs.length; ++i) {
        timestamp = Math.max(timestamp, docs[i].timestamp);
      }
      console.log(timestamp);
  });
});

// Load the db
var URL = 'localhost';

var app = express();

// View Engine Setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Morgan Logger
app.use(logger('dev'));

// Body Parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Set multer
app.use(multer({
  dest: './files/',
  rename: function(fieldname, filename) {
    return filename;
  }
}));

app.get('/sync/:timestamp', function(req, res) {
  console.log(parseInt(req.params.timestamp));
  File.find({})
    .where('timestamp').gt(parseInt(req.params.timestamp))
    .exec(function(err, data) {
      console.log(data);
      res.json(data);
    });
});

app.get('/download/:filename', function(req, res) {
  var PATH = __dirname + '/files/' + req.params.filename;
  res.download(PATH, function(err) {
    if (err) {
      console.log('download: ' + req.params.filename + ' ' + err);
    }
  });
});

app.post('/upload/', function(req, res) {
  console.log('upload ' + req.files.file.name);
  console.log(req.files);
  timestamp += 1;
  File.findOneAndUpdate({
    filename: req.files.file.name
  }, {
    filename: req.files.file.name,
    last_update: Date.now(),
    timestamp: timestamp,
    deleted: false
  }, {
    upsert: true
  }, function(err) {

  });
  res.json({
    message: "success",
    timestamp: timestamp
  });
});

app.get('/delete/:filename', function(req, res) {
  var path = __dirname + '/files/' + req.params.filename;
  fs.unlinkSync(path);
  File.findOneAndUpdate({
    filename: req.params.filename
  }, {
    deleted: true
  }, function(err) {
    if (err) console.log(err);
  });
  res.json({
    message: "success"
  });
});

app.get('/', function(req, res) {
  File.find({}, function(err, data) {
    console.log(data);
    var fileList = [];
    for (var i = 0; i < data.length; ++i) {
      console.log(data[i]);
      if (!data[i].deleted) {
        fileList.push({
          filename: data[i].filename,
          timestamp: data[i].timestamp,
          path: '/download/' + data[i].filename,
          size: '123KBytes',
          lastModified: data[i].last_update
        });
      }
    }
    res.render('index', { fileList: fileList });
  })
});

var server = app.listen(80, function() {

});
