'use strict';

var gulpFcsh = require('../'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    stream = require('stream'),
    os = require('os'),
    fs = require('fs'),
    path = require('path'),
    buffer = require('buffer'),
    assert = require('assert');

describe('gulp-fcsh', function() {
  var tempdir = os.tmpdir(),
      asPath = path.join(tempdir, 'Test.as'),
      swfPath = path.join(tempdir, 'Test.swf'),
      destDirPath = path.join(tempdir, 'dest'),
      destPath = path.join(destDirPath, 'Test.swf');

  var fakeFile = new gutil.File({
    cwd: tempdir,
    base: tempdir,
    path: asPath,
    contents: new buffer.Buffer('foo')
  });

  describe('compilation', function() {
    this.timeout(10000);

    var testCase = function(fixturePath, assertFn) {
      var inputStream = stream.PassThrough({ objectMode: true }),
          outputStream = stream.PassThrough({ objectMode: true }),
          fcshStream = gulpFcsh({
            compileOptions: '-static-link-runtime-shared-libraries'
          });

      return function(done) {
        fs.writeFileSync(
          asPath,
          fs.readFileSync(fixturePath)
        );

        assert.ok(!fs.existsSync(swfPath));

        inputStream
          .pipe(fcshStream)
          .on('error', function(e) {
            assertFn(e);
            done();
          })
          .pipe(gulp.dest(destDirPath))
          .pipe(outputStream);

        outputStream.on('readable', function() {
          var newFile = outputStream.read();

          assertFn(newFile);

          done();
        });

        inputStream.write(fakeFile);
        inputStream.end();
      };
    };

    beforeEach(function() {
      if (fs.existsSync(swfPath)) {
        fs.unlinkSync(swfPath);
      }
    });

    it('raises error', testCase(fixturePath('Test_error.as'), function(e) {
      assert.equal(e.constructor.name, 'PluginError');
      assert.equal(e.message, 'failed to compile');
    }));

    it('compiles', testCase(fixturePath('Test.as'), function(newFile) {
      assert(newFile);
      assert.equal(newFile.base, destDirPath);
      assert.equal(newFile.path, destPath);
      assert.ok(fs.existsSync(destPath));
    }));

    it('raises error again', testCase(fixturePath('Test_error.as'), function(e) {
      assert.equal(e.constructor.name, 'PluginError');
      assert.equal(e.message, 'failed to compile');
    }));

    // TODO: check whether the compile target id is used
    it('compiles again', testCase(fixturePath('Test.as'), function(newFile) {
      assert(newFile);
      assert.equal(newFile.base, destDirPath);
      assert.equal(newFile.path, destPath);
      assert.ok(fs.existsSync(destPath));
    }));
  });
});

function fixturePath(baseName) {
  return path.resolve(__dirname, baseName);
}
