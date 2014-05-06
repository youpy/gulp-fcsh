# gulp-fcsh

A gulp plugin for [fcsh](http://help.adobe.com/en_US/flex/using/WS2db454920e96a9e51e63e3d11c0bf67670-7fcd.html)

## Usage

```javascript
var fsch = require('gulp-fcsh'),

gulp.src('Main.as')
  .pipe(fcsh({
    compileOptions: '-static-link-runtime-shared-libraries'
  }))
  .pipe(connect.reload());
});
```
