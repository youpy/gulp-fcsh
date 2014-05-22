'use strict';

var gulpFcsh = require('../'),
    gutil = require('gulp-util'),
    stream = require('stream'),
    os = require('os'),
    fs = require('fs'),
    path = require('path'),
    buffer = require('buffer'),
    assert = require('assert');

describe('gulp-fcsh', function() {
  describe('compilation', function() {
    this.timeout(5000);

    var tempdir = os.tmpdir(),
        asPath = path.join(tempdir, 'Test.as'),
        swfPath = path.join(tempdir,  'Test.swf');

    var testCase = function(done) {
      var fakeFile = new gutil.File({
        cwd: tempdir,
        base: tempdir,
        path: asPath,
        contents: new buffer.Buffer('foo')
      }),
          inputStream = stream.PassThrough({ objectMode: true }),
          outputStream = stream.PassThrough({ objectMode: true }),
          fcshStream = gulpFcsh({
            compileOptions: '-static-link-runtime-shared-libraries'
          });

      assert.ok(!fs.existsSync(swfPath));

      inputStream
        .pipe(fcshStream)
        .pipe(outputStream);

      outputStream.on('readable', function() {
        var newFile = outputStream.read();

        assert(newFile);
        assert.equal(newFile.cwd, tempdir);
        assert.equal(newFile.base, tempdir);
        assert.equal(newFile.path, swfPath);

        assert.ok(fs.existsSync(swfPath));

        done();
      });

      inputStream.write(fakeFile);
      inputStream.end();
    };

    beforeEach(function() {
      if(fs.existsSync(swfPath)) {
        fs.unlinkSync(swfPath);
      }

      fs.writeFileSync(asPath, fs.readFileSync(path.resolve(__dirname, 'Test.as')));
    });

    it('compiles', testCase);

    // TODO: check whether the compile target id is used
    it('compiles again', testCase);
  });
});

