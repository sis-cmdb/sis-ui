module.exports = function(grunt) {

  grunt.file.defaultEncoding = 'utf8';

  var docs = [];
  if (grunt.option('docpath')) {
    var docpath = grunt.option('docpath');
    if (!grunt.file.isDir(docpath)) {
        return grunt.fail.fatal("docpath must be a valid directory.");
    }
    var homeTuple = null;
    grunt.file.recurse(docpath, function(abs, root, subdir, filename) {
        if (filename.indexOf('.md') == filename.length - 3) {
            var noExt = filename.substring(0, filename.length - 3);
            var title = noExt[0].toUpperCase() + noExt.substring(1);
            if (noExt == 'rbac') {
                title = "RBAC";
            }
            if (noExt == 'index') {
                homeTuple = [noExt, abs, title];
                return;
            }
            docs.push([noExt, abs, title]);
        }
    });
    docs.unshift(homeTuple);
  }

  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    build_dirs : {
        dist : "dist",
        src : "src",
        build : "build",
        bower : "bower_components"
    },
    buildjson : {
        options : {
            dest : '<%= build_dirs.dist %>'
        }
    },
    peg: {
        options: { trackLineAndColumn: true },
        query : {
          src: "<%= build_dirs.src %>/pegjs/query.pegjs",
          dest: "<%= build_dirs.build %>/pegjs/query.js",
          angular: {
            module: "sisui",
            factory: "SisQueryParser"
          }
        }
    },
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
              var docNames = docs.map(function(d) { return d[0]; });
              docNames.forEach(function(d) {
                if (req.url.indexOf('/docs/' + d) != -1) {
                    res.setHeader('Content-Type', 'text/html');
                }
              });
              return next();
            };
            middlewares.unshift(func);
            return middlewares;
          }
        }
      }
    },
    copy: {
      dist_common : {
        files : [
          {
            expand : true,
            cwd : '<%= build_dirs.src %>',
            src: ['app/**/*.css', 'docs/**/*.css', 'common/images/**'],
            dest: '<%= build_dirs.dist %>/',
          },
          // bootswatch
          {
            cwd : '<%= build_dirs.bower %>/bootswatch',
            expand : true,
            src: ['**/*.css', '**/glyphicons*'],
            dest: '<%= build_dirs.dist %>/common/css/bootswatch',
          },
          // jsondiff patch
          {
            cwd : '<%= build_dirs.bower %>/jsondiffpatch/public/formatters-styles',
            expand : true,
            src: ['*.css'],
            dest: '<%= build_dirs.dist %>/common/css/jsondiffpatch/',
          }
        ]
      },
      dist_js: {
        files : [
          // app
          {
            expand : true,
            flatten : true,
            cwd : '<%= build_dirs.build %>',
            src: ['sisui.min.*', 'app/vendor-libs.js'],
            dest: '<%= build_dirs.dist %>/app/js/',
          },
          {
            // ace
            expand : true,
            cwd : '<%= build_dirs.bower %>/ace-builds/src-min-noconflict',
            src : ['**/*.js'],
            dest : '<%= build_dirs.dist %>/app/js/vendor/ace'
          }
        ]
      },
      localconfig : {
        files : [
            {
                expand : true,
                cwd : '<%= build_dirs.src %>',
                src: ['app/js/config.js'],
                dest: '<%= build_dirs.dist %>/'
            }
        ]
      }
    },
    jshint: {
      files: ['Gruntfile.js',
              '<%= build_dirs.src %>/app/**/*.js',
              '<%= build_dirs.src %>/app/js/**/*.js',
              '<%= build_dirs.src %>/docs/js/*.js',
              'test/**/*.js'
              ],
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
      }
    },
    // place holder for docs
    sismd : {
        docs : { }
    },
    // Swig
    sisswig : {
        options : {
            swigDefaults : {
                autoescape : false
            }
        },
        app : {
            // src -> dest
            src: ["<%= build_dirs.src %>/index.swig"],
            dest : "<%= build_dirs.dist %>/index.html",
            // data
            context : {
                scripts : ['./app/js/vendor-libs.js', './app/js/config.js', './app/js/sisui.min.js'],
                theme : './common/css/bootswatch/{{ bootstrap_theme }}/bootstrap.min.css',
                // can make this more dynamic, but might clutter things
                themes : ['flatly', 'darkly', 'slate'],
                css : ['./common/css/jsondiffpatch/html.css',
                       './common/css/jsondiffpatch/annotated.css',
                       './app/css/style.css'],
                version : ( Math.round(Date.now() / 1000) ),
                docs : docs
            }
        }
    },
    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            'dist/**/*'
          ]
        }]
      },
      build : 'build',
      server: '.tmp'
    },
    watch: {
      js: {
        files: ['<%= build_dirs.src %>/app/js/**/*.js'],
        tasks: ['newer:jshint', 'uglify', 'copy:dist_js', 'copy:localconfig']
      },
      templates : {
        files: ['<%= build_dirs.src %>/app/partials/*.html'],
        tasks: ['ngtemplates', 'uglify', 'copy:dist_js']
      },
      swigs : {
        files : ['<%= build_dirs.src %>/**/*.swig'],
        tasks: ['sisswig']
      },
      peg : {
        files : ['<%= build_dirs.src %>/pegjs/*.js'],
        tasks: ['peg', 'uglify', 'copy:dist_js']
      },
      common: {
        files : ['<%= build_dirs.src %>/app/**/*.css',
                 '<%= build_dirs.src %>/common/css/**',
                 '<%= build_dirs.src %>/common/images/**',
                 '<%= build_dirs.src %>/docs/**/*.css'
                ],
        tasks: ['copy:dist_common']
      },
      livereload: {
        options: {
          livereload: '<%= connect.options.livereload %>'
        },
        files: [
          '<%= build_dirs.dist %>/**/*.html',
          '<%= build_dirs.dist %>/app/**/*.js',
          '<%= build_dirs.dist %>/app/**/*.css'
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
            cwd : "<%= build_dirs.src %>",
            src : ["app/**/partials/*.html"],
            dest : '<%= build_dirs.build %>/templates/partials.js'
        }
    },
    concat : {
        // vendor libs
        options : {
            separator : ';\n'
        },
        vendor : {
            files : {
                // libs for the angular app
                '<%= build_dirs.build %>/app/vendor-libs.js' :
                    // order matters
                    // jquery
                    ['<%= build_dirs.bower %>/jquery/dist/jquery.min.js',
                     // angular
                     '<%= build_dirs.bower %>/angular/angular.js',
                     // angular router
                     '<%= build_dirs.bower %>/angular-ui-router/release/angular-ui-router.js',
                     // angular bootstrap
                     '<%= build_dirs.bower %>/angular-bootstrap/ui-bootstrap-tpls.js',
                     // moment
                     '<%= build_dirs.bower %>/moment/min/moment.min.js',
                     // jsondiff -
                     '<%= build_dirs.bower %>/jsondiffpatch/public/build/jsondiffpatch-full.min.js',
                     '<%= build_dirs.bower %>/jsondiffpatch/public/build/jsondiffpatch-formatters.min.js',
                     // ipv6 - https://github.com/beaugunderson/javascript-ipv6
                     '<%= build_dirs.bower %>/ipv6/lib/browser/jsbn-combined.js',
                     '<%= build_dirs.bower %>/ipv6/lib/browser/sprintf.js',
                     '<%= build_dirs.bower %>/ipv6/ipv6.js',
                     // sis client
                     '<%= build_dirs.bower %>/sis/lib/sis-client.js'

                    ]
            }
        }
    },
    uglify: {
      options: {
        mangle: false,
        sourceMap : true,
        sourceMapIncludeSources : true
      },
      build : {
        files : {
            // sis-ui
            '<%= build_dirs.build %>/sisui.min.js' :
                ['<%= build_dirs.src %>/app/js/app.js',
                 '<%= build_dirs.src %>/app/js/components/*.js',
                 '<%= build_dirs.build %>/pegjs/query.js',
                 '<%= build_dirs.build %>/templates/partials.js',
                 '<%= build_dirs.src %>/app/js/controllers/*.js'
                ]
        }
      }
    }
  });

  if (docs.length) {
    // dynamic config the docs for swig
    grunt.config.set('sismd.docs', {
        files : docs.reduce(function(ret, docTuple) {
            var src = [docTuple[1]];
            var dst = "<%= build_dirs.build %>/docs/" + docTuple[0];
            ret[dst] = src;
            return ret;
        }, { })
    });

    docs.forEach(function(docTuple) {
      var path = require('path');
      var doc = docTuple[0];
      grunt.config.set('sisswig.docs_' + doc, {
          // src -> dest
          src: ["<%= build_dirs.src %>/docs/docs.swig"],
          dest : "<%= build_dirs.dist %>/app/docs/" + doc,
          // data
          context : {
              contentFile : path.resolve("<%= build_dirs.build %>/docs/" + doc)
          }
      });
    });
  }


  grunt.registerTask('serve', function () {
    if (!grunt.file.isFile('./src/app/js/config.js')) {
        return grunt.fail.fatal("src/app/js/config.js does not exist.");
    }
    grunt.task.run(['build', 'copy:localconfig', 'connect:dist', 'watch']);
  });

  grunt.registerTask('copydist', function() {
    grunt.task.run(['copy:dist_js', 'copy:dist_common']);
  });

  grunt.registerTask('build', [
    'clean',
    'jshint',
    'sismd',
    'peg',
    'ngtemplates',
    'uglify',
    'concat',
    'copydist',
    'buildjson',
    'sisswig'
  ]);

  grunt.registerTask('default', ['newer:jshint','build']);


};
