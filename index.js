'use strict';

var PLUGIN_NAME = 'gulp-fcsh';

var _ = require('lodash'),
    fs = require('fs'),
    through = require('through2'),
    gutil = require('gulp-util'),
    File = require('vinyl'),
    PluginError = gutil.PluginError;

var spawn = require('child_process').spawn,
    fcsh = spawn('fcsh'),
    targetIds = {};

fcsh.stderr.pipe(process.stderr);

function removeListeners() {
  fcsh.stdout.removeAllListeners('data');
  fcsh.stdout.removeAllListeners('error');
}

function gulpFcsh(options) {
  var str = '';

  options = _.extend({
    compileOptions: ''
  }, options);

  var stream = through.obj(function(file, enc, done) {
    var self = this;

    if(file.isNull()) {
      this.push(file);
      return done();
    }

    if(targetIds[file.path]) {
      fcsh.stdin.write("\n");
    }

    fcsh.stdout
      .on('data', function(chunk) {
        str += chunk.toString();

        if(!str.match(/\(fcsh\) $/)) {
          return false;
        }

        if(str.match(/\.swf \(\d+ bytes\)/)) {
          var matched = str.match(/fcsh: Assigned (\d+) as/);

          if(matched) {
            targetIds[file.path] = matched[1];
          }

          removeListeners();

          var swfPath = file.path.replace(/\.as$/, '.swf');
          var swfFile = new File({
            cwd: file.cwd,
            base: file.base,
            path: swfPath,
            contents: fs.createReadStream(swfPath)
          });

          self.push(swfFile);

          done();
        } else if(str.match(/Nothing\ has\ changed/)) {
          removeListeners();

          done();
        } else if(str.match(/^Adobe/)) {
          str = '';

          fcsh.stdin.write('mxmlc ' + options.compileOptions + ' ' + file.path + "\n");
        } else if(str.match(/^\(fcsh\) $/)) {
          str = '';

          if(targetIds[file.path]) {
            fcsh.stdin.write('compile ' + targetIds[file.path] + "\n");
          }
        } else {
          removeListeners();
          self.emit('error', new gutil.PluginError(PLUGIN_NAME, 'failed to compile'));

          done();
        }
      })
      .on('error', function() {
        removeListeners();
        self.emit('error', new gutil.PluginError(PLUGIN_NAME, 'failed to execute fcsh'));

        done();
      });
  });

  return stream;
}

module.exports = gulpFcsh;
