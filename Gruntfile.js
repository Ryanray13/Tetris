module.exports = function(grunt) {

  'use strict';

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
      options: {
        curly: true,
        eqeqeq: true,
        eqnull: true,
        browser: true,
        strict: true,
        undef: true,
        unused: true,
        bitwise: true,
        forin: true,
        freeze: true,
        latedef: true,
        noarg: true,
        nocomma: true,
        nonbsp: true,
        nonew: true,
        notypeof: true,
        jasmine: true,
        globals: {
          handleDragEvent: false,
          module: false, require: false, // for Gruntfile.js
          angular: false,
          console: false,
        },
      },
      all: ['app/js/tetris.js', 'app/languages/*.js', 'realTimeService.js']
    },
    uglify: {
      options: {
        sourceMap: true,
      },
      my_target: {
        files: {
          'app/dist/tetris.min.js': ['app/js/tetris.js']
        }
      }
    },
    processhtml: {
      dist: {
        files: {
          'app/index.min.html': ['app/index.html']
        }
      }
    },
    manifest: {
      generate: {
        options: {
          basePath: 'app',
          cache: [
            'http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular.min.js',
            'http://cdnjs.cloudflare.com/ajax/libs/seedrandom/2.3.11/seedrandom.min.js',
            'http://ajax.googleapis.com/ajax/libs/angularjs/1.3.8/angular-touch.min.js',
            'http://cdnjs.cloudflare.com/ajax/libs/angular-ui-bootstrap/0.12.1/ui-bootstrap-tpls.min.js',
            'http://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap.min.css',
            'http://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/fonts/glyphicons-halflings-regular.woff',
            'http://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/fonts/glyphicons-halflings-regular.ttf',
            'http://yoav-zibin.github.io/emulator/dist/realTimeServices.2.min.js',
            'http://yoav-zibin.github.io/emulator/main.css',
            'dist/tetris.min.js',
            'dist/fpsmeter.min.js',
            'css/game.css',
            'imgs/HelpSlide1.jpg',
            'imgs/HelpSlide2.jpg',
            'imgs/HelpSlide3.jpg',
            'imgs/HelpSlide4.jpg',
            'imgs/HelpSlide5.jpg'
          ],
          network: [
            'languages/zh.js',
            'languages/en.js',
            'dist/tetris.min.js.map',
            'js/tetris.js'
          ],
          timestamp: true
        },
        dest: 'app/tetris.appcache',
        src: []
      }
    },
    'http-server': {
        'dev': {
            // the server root directory
            root: '.',
            port: 9000,
            host: "0.0.0.0",
            cache: 1,
            showDir : true,
            autoIndex: true,
            // server default file extension
            ext: "html",
            // run in parallel with other tasks
            runInBackground: true
        }
    },
  });

  require('load-grunt-tasks')(grunt);

  // Default task(s).
  grunt.registerTask('default', ['jshint', 'uglify', 'processhtml', 'manifest']);

};
