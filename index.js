'use strict';

var PLUGIN_NAME = 'gulp-fcsh';

var _ = require('lodash'),
    fs = require('fs'),
    through = require('through2'),
    gutil = require('gulp-util'),
    File = require('vinyl'),
    PluginError = gutil.PluginError,
    spawn = require('child_process').spawn,
    fcsh = spawn('fcsh'),
    targetIds = {};

fcsh.stderr.pipe(process.stderr);

function removeListeners() {
  fcsh.stdout.removeAllListeners('data');
  fcsh.stdout.removeAllListeners('error');
}

function err(msg) {
  return new gutil.PluginError(PLUGIN_NAME, msg);
}

function gulpFcsh(options) {
  var str = '';

  options = _.extend({
    compileOptions: ''
  }, options);

  var stream = through.obj(function(file, enc, done) {
    var self = this;

    if (file.isNull()) {
      done(null, file);
      return;
    }

    if (targetIds[file.path]) {
      fcsh.stdin.write('\n');
    }

    fcsh.stdout
      .on('data', function(chunk) {
        str += chunk.toString();

        var matched = str.match(/fcsh: Assigned (\d+) as/);
        if (matched) {
          targetIds[file.path] = matched[1];
        }

        if (str.match(/\(fcsh\) $/)) {
          if (str.match(/\.swf \(\d+ bytes\)/)) {
            removeListeners();

            var swfPath = file.path.replace(/\.as$/, '.swf');
            var swfFile = new File({
              cwd: file.cwd,
              base: file.base,
              path: swfPath,
              contents: fs.createReadStream(swfPath)
            });

            done(null, swfFile);
          } else if (str.match(/Nothing\ has\ changed/)) {
            removeListeners();

            done(null, null);
          } else if (str.match(/^(Adobe|Apache)/)) {
            str = '';

            fcsh.stdin.write(
              'mxmlc ' + options.compileOptions + ' ' +
                file.path + '\n'
            );
          } else if (str.match(/^\(fcsh\) $/)) {
            str = '';

            if (targetIds[file.path]) {
              fcsh.stdin.write('compile ' + targetIds[file.path] + '\n');
            }
          } else {
            removeListeners();

            done(err('failed to compile'), null);
          }
        }
      })
      .on('error', function() {
        removeListeners();

        done(err('failed to execute fcsh'), null);
      });
  });

  return stream;
}

module.exports = gulpFcsh;
