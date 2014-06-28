module.exports = function(grunt) {

  grunt.file.defaultEncoding = 'utf8';

  require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    build_dirs : {
        dist : "dist",
        src : "src",
        build : "build",
        sisjs : "../SIS-js",
        sisweb : "../SIS-web"
    },
    buildjson : {
        options : {
            dest : '<%= build_dirs.dist %>'
        }
    },
    sismd : {
        docs : {
            files : {
                "<%= build_dirs.build %>/docs/index" : ["<%= build_dirs.sisweb %>/README.md"],
                "<%= build_dirs.build %>/docs/rbac" : ["<%= build_dirs.sisweb %>/docs/rbac.md"],
                "<%= build_dirs.build %>/docs/sharing" : ["<%= build_dirs.sisweb %>/docs/sharing.md"],
            }
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
              var docs = ['index', 'rbac', 'sharing'];
              docs.forEach(function(d) {
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
            src: ['app/**/*.css'],
            dest: '<%= build_dirs.dist %>/',
          },
          // docs
          {
            cwd : '<%= build_dirs.src %>',
            expand : true,
            src: ['docs/**/*.css'],
            dest: '<%= build_dirs.dist %>/',
          },
          {
            cwd : '<%= build_dirs.src %>',
            expand : true,
            src: ['common/css/**', 'common/images/**'],
            dest: '<%= build_dirs.dist %>/',
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
            expand : true,
            flatten : true,
            cwd : '<%= build_dirs.build %>',
            src: ['sisdocs.min.*', 'docs/vendor-libs.js'],
            dest: '<%= build_dirs.dist %>/docs/js/',
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
      files: ['Gruntfile.js', '<%= build_dirs.src %>/app/**/*.js', '<%= build_dirs.src %>/app/js/**/*.js', '<%= build_dirs.src %>/docs/js/*.js', 'test/**/*.js', '!<%= build_dirs.src %>/common/vendor/**/*.js'],
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
                theme : './common/css/bootswatch/3.1.1/{{ bootstrap_theme }}/bootstrap.min.css',
                themes : ['flatly', 'darkly', 'slate'],
                css : ['./common/css/jsondiffpatch/html.css',
                       './common/css/jsondiffpatch/annotated.css',
                       './app/css/style.css'],
                version : ( Math.round(Date.now() / 1000) )
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
        files: ['<%= build_dirs.src %>/app/js/**/*.js'],
        tasks: ['newer:jshint', 'uglify', 'copy:dist_js', 'copy:localconfig']
      },
      libs : {
        files: ['<%= build_dirs.sisjs %>/lib/sis-js.js'],
        tasks: ['concat', 'copy:dist_js']
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
                    ['<%= build_dirs.src %>/common/js/vendor/jquery/1.11.0/jquery-1.11.0.min.js',
                    // angular
                     '<%= build_dirs.src %>/common/js/vendor/angularjs/1.2.17/angular.min.js',
                     '<%= build_dirs.src %>/common/js/vendor/ui.router/0.2.10/angular-ui-router.min.js',
                     // angular bootstrap
                     '<%= build_dirs.src %>/common/js/vendor/ui.bootstrap/0.10.0/ui-bootstrap-tpls-0.10.0.min.js',
                     // moment
                     '<%= build_dirs.src %>/common/js/vendor/moment.min.js',
                     // jsondiff -
                     '<%= build_dirs.src %>/common/js/vendor/jsondiffpatch/bundle-full.min.js',
                     '<%= build_dirs.src %>/common/js/vendor/jsondiffpatch/formatters.min.js',
                     // ipv6 - https://github.com/beaugunderson/javascript-ipv6
                     '<%= build_dirs.src %>/common/js/vendor/ipv6/jsbn-combined.js',
                     '<%= build_dirs.src %>/common/js/vendor/ipv6/sprintf.js',
                     '<%= build_dirs.src %>/common/js/vendor/ipv6/ipv6.js'
                    ],
                // libs for docs
                '<%= build_dirs.build %>/docs/vendor-libs.js' :
                    // order matters
                    ['<%= build_dirs.src %>/common/js/vendor/jquery/1.11.0/jquery-1.11.0.min.js',
                     '<%= build_dirs.src %>/common/js/vendor/bootstrap/3.1.1/bootstrap-3.1.1.min.js'
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
                ['<%= build_dirs.sisjs %>/lib/sis-js.js',
                 '<%= build_dirs.src %>/app/js/app.js',
                 '<%= build_dirs.src %>/app/js/components/*.js',
                 '<%= build_dirs.build %>/pegjs/query.js',
                 '<%= build_dirs.build %>/templates/partials.js',
                 '<%= build_dirs.src %>/app/js/controllers/*.js'
                ],
            // sis-docs
            '<%= build_dirs.build %>/sisdocs.min.js' :
                ['<%= build_dirs.src %>/docs/js/doc.js']
        }
      }
    }
  });

  // dynamic config the docs for swig
  var docs = [
    { path : 'index', title : "SIS" },
    { path : 'rbac', title : "SIS RBAC" },
    { path : 'sharing', title : "SIS Data Sharing" }
  ];
  docs.forEach(function(conf) {
    var path = require('path');
    var doc = conf.path;
    grunt.config.set('sisswig.docs_' + doc, {
        // src -> dest
        src: ["<%= build_dirs.src %>/docs/docs.swig"],
        dest : "<%= build_dirs.dist %>/app/docs/" + (conf.out || doc),
        // data
        context : {
            scripts : ['./js/vendor-libs.js', './js/sisdocs.min.js'],
            css : ['../common/css/bootswatch/3.1.1/flatly/bootstrap.min.css',
                   './css/docs.css'],
            contentFile : path.resolve("<%= build_dirs.build %>/docs/" + doc),
            title : conf.title
        }
    });
  });

  grunt.registerTask('serve', function () {
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