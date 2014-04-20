module.exports = function(grunt) {

  grunt.file.defaultEncoding = 'utf8';

  require('load-grunt-tasks')(grunt);

  var marked = require('marked');
  marked.setOptions({
    breaks : true
  });
  var hljs = require('highlight.js');
  var fs = require('fs');

  marked.setOptions({
    highlight: function(code, lang) {
      var result =  hljs.highlight(lang, code).value;
      return result;
    }
  });

  var getDocData = function(dest, src) {
    var replaceMents = [
        ['./docs/rbac.md', './rbac'],
        ['./docs/sharing.md', './sharing'],
        ['./rbac.md', './rbac']
    ];
    console.log(dest + " -> " + src);
    var srcMd = "../SIS-web/README.md";
    var srcTitle = "SIS Documentation";
    var baseFile = dest.split('/');
    var filename = baseFile[baseFile.length - 1];
    if (filename != 'index.html') {
        srcMd = "../SIS-web/docs/" + filename + ".md";
        switch (baseFile) {
            case 'rbac':
                srcTitle = "SIS RBAC";
                break;
            case 'sharing':
                srcTitle = "SIS Data Sharing";
                break;
            default:
                break;
        }
    }


    var mdData = grunt.file.read(srcMd);
    for (var i = 0; i < replaceMents.length; ++i) {
        var r = replaceMents[i];
        mdData = mdData.replace(r[0], r[1]);
    }
    var html = marked(mdData);
    return {
        'docHtml' : html,
        'title' : srcTitle
    };
  };

  // TODO: minfiy / concat if needed?

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // The actual grunt server settings
    connect: {
      options: {
        port: 9000,
        // Change this to '0.0.0.0' to access the server from outside.
        hostname: 'localhost',
        livereload: 35729
      },
      livereload: {
        options: {
          open: true
        }
      },
      dist: {
        options: {
          base: 'dist',
          middleware : function(connect, options, middlewares) {
            var func = function(req, res, next) {
              if (req.url.indexOf('/docs/rbac') != -1 ||
                req.url.indexOf('/docs/sharing') != -1) {
                res.setHeader('Content-Type', 'text/html');
              }
              return next();
            };
            middlewares.unshift(func);
            return middlewares;
          }
        }
      }
    },
    // TODO: add minification if needed
    copy: {
      dist: {
        files : [
          {
            src: ['public/**/*', '!**/sis-js.js'],
            dest: 'dist/',
          },
          {
            src: 'index.html',
            dest: 'dist/'
          },
          {
            src: ['docs/**/*', '!**/*.jade'],
            dest: 'dist/',
          },
          {
            src: "../SIS-js/lib/sis-js.js",
            dest: 'dist/public/app/lib/sis-js.js'
          }
        ]
      }
    },
    qunit: {
      files: ['test/**/*.html']
    },
    jshint: {
      files: ['Gruntfile.js', 'public/app/**/*.js', 'public/app/js/**/*.js', 'docs/js/*.js', 'test/**/*.js', '!public/app/lib/ui.bootstrap/*.js'],
      options: {
        // options here to override JSHint defaults
        globals: {
          console: true,
          module: true,
          document: true,
          angular: true,
          SIS: true,
          localStorage: true
        }
      },
      dist: ['dist/**/*.js', '!dist/public/app/lib/ui.bootstrap/*.js']
    },
    // create documents
    jade: {
        docs: {
            options: {
                data: getDocData
            },
            files : {
                "dist/docs/index.html" : "docs/docs.jade",
                "dist/docs/rbac" : "docs/docs.jade",
                "dist/docs/sharing" : "docs/docs.jade",
            }
        }
    },
    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            'dist'
          ]
        }]
      },
      build : 'build',
      server: '.tmp'
    },
    watch: {
      js: {
        files: ['public/app/**/*.js'],
        tasks: ['newer:jshint'],
        options: {
          livereload: true
        }
      },
      css: {
        files : ['public/app/**/*.css'],
        options: {
          livereload: true
        }
      },
      gruntfile: {
        files: ['Gruntfile.js']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          'public/**/*.html',
          'public/app/**/*.js'
        ]
      }
    },
    ngtemplates : {
        sisui: {
            options: {
                module : "sisui",
                htmlmin: {
                  collapseBooleanAttributes:      true,
                  collapseWhitespace:             true,
                  removeAttributeQuotes:          true,
                  removeComments:                 true, // Only if you don't use comment directives!
                  removeEmptyAttributes:          true,
                  removeRedundantAttributes:      true,
                  removeScriptTypeAttributes:     true,
                  removeStyleLinkTypeAttributes:  true
                }
            },
            src : ["**/partials/*.html"],
            dest : 'build/partials.js'
        }
    },
    uglify: {
      options: {
        mangle: false,
        sourceMap : true
      },
      build : {
        files : {
            'build/sisui.min.js' : ['public/app/js/app.js', 'public/app/js/components/*.js', 'public/app/js/controllers/*.js']
        }
      }
    }
  });

  grunt.registerTask('serve', function (target) {
    if (target === 'dist') {
      return grunt.task.run(['build', 'connect:dist:keepalive']);
    }

    grunt.task.run([
      'clean:server',
      'connect:livereload',
      'watch'
    ]);
  });

  grunt.registerTask('build', [
    'clean:dist',
    'ngtemplates',
    'uglify:build',
    'copy:dist',
    'jshint:dist',
    'jade:docs'
  ]);

  grunt.registerTask('default', ['newer:jshint','build']);


};