var gulp = require('gulp');
var ts = require('gulp-typescript');
var gutil = require('gulp-util');
var less = require('gulp-less');
var autoprefix = require('gulp-autoprefixer');
var minifyCSS = require('gulp-minify-css');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

gulp.task('scripts', function () {
    var tsProject = ts.createProject('tsconfig.json');
    var tsResult = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsProject());

    return tsResult.js
        //.pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('web/res/'));
});

gulp.task('css', function () {
    return gulp.src('web/src/*.less')
        .pipe(less({ style: 'compressed' }).on('error', gutil.log))
        .pipe(autoprefix('last 3 version'))
        .pipe(minifyCSS())
        .pipe(gulp.dest('web/res/'));
});

gulp.task('watcher', function () {
    gulp.watch('web/src/*.less', ['css']);
    gulp.watch(['tsconfig.json', 'web/src/**/*.ts'], ['scripts']);
});

gulp.task('watch', ['css', 'scripts', 'watcher']);
gulp.task('default', ['css', 'scripts']);
