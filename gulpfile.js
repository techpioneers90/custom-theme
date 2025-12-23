const { src, dest, watch, series } = require('gulp');
const concat = require('gulp-concat');
const terser = require('gulp-terser');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const purgecss = require('gulp-purgecss');

// المسارات
const paths = {
  css: [
    'assets/icomoon.css',
    'assets/animate.css',
    'assets/jquery-ui.min.css',
    'assets/jquery-ui.structure.min.css',
    'assets/jquery-ui.theme.min.css',
    'assets/slick.css',
    'assets/slick-theme.css',
    'assets/swiper-bundle.min.css',
    'assets/mmenu.min.css',
    'assets/main.css',
    'assets/custom.css'
  ],
  js: [
    'assets/jquery-3.6.0.min.js',
    'assets/jquery-ui.min.js',
    'assets/popper.min.js',
    'assets/bootstrap.min.js',
    'assets/mmenu.js',
    'assets/slick.min.js',
    'assets/swiper-bundle.min.js'
  ],
  twig: [
    'views/**/*.twig' // تحديد مسار ملفات Twig
  ]
};

// مهمة PurgeCSS لإزالة الأكواد غير المستخدمة
function purgeCSSTask() {
  return src(paths.css)
    .pipe(purgecss({
      content: paths.twig, // استخدام ملفات Twig هنا
      safelist: ['.keep-this-class'], // إضافة الأصناف التي تريد الاحتفاظ بها
    }))
    .pipe(cleanCSS()) // ضغط الـ CSS بعد التنظيف
    .pipe(rename({ suffix: '.min' }))
    .pipe(dest('assets/'));
}

// مهمة CSS
function cssTask() {
  return src(paths.css)
    .pipe(concat('all-styles.min.css'))
    .pipe(purgeCSSTask()) // دمج مهمة PurgeCSS هنا
    .pipe(dest('assets/'));
}

// مهمة JS
function jsTask() {
  return src(paths.js)
    .pipe(concat('scripts.js'))
    .pipe(rename({ suffix: '.bundle.min' }))
    .pipe(dest('assets/'));
}

// المراقبة التلقائية
function watchTask() {
  watch(paths.css, cssTask);
  watch(paths.js, jsTask);
  watch(paths.twig, cssTask); // إضافة مراقبة لملفات Twig
}

exports.default = series(cssTask, jsTask, watchTask);
