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
    sismd : {
        options : {
            preprocess : function(data) {
                var replacements = [
                    [/\.\/docs\/rbac\.md/g, './rbac'],
                    [/\.\/docs\/sharing\.md/g, './sharing'],
                    [/\.\/rbac\.md/g, './rbac']
                ];
                replacements.forEach(function(r) {
                    data = data.replace(r[0], r[1]);
                });
                return data;
            }
        },
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
            factory: "queryParser"
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
      dist: {
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
            expand : true,
            flatten : true,
            cwd : '<%= build_dirs.build %>',
            src: ['sisdocs.min.*', 'docs/vendor-libs.js'],
            dest: '<%= build_dirs.dist %>/docs/js/',
          },
          {
            cwd : '<%= build_dirs.src %>',
            expand : true,
            src: ['common/css/**', 'common/images/**'],
            dest: '<%= build_dirs.dist %>/',
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
                css : ['./common/css/bootswatch/3.1.1/flatly/bootstrap.min.css',
                       './app/css/style.css']
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
        files: ['<%= build_dirs.src %>/app/**/*.js','<%= build_dirs.src %>/docs/js/*.js'],
        tasks: ['newer:jshint'],
        options: {
          livereload: true
        }
      },
      css: {
        files : ['<%= build_dirs.src %>/app/**/*.css'],
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
          '<%= build_dirs.dist %>/**/*.html',
          '<%= build_dirs.dist %>/app/**/*.js'
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
            separator : ';'
        },
        // app : {
        //     options : {
        //         separator : ''
        //     },
        //     files : {
        //         // sis-ui
        //         '<%= build_dirs.build %>/sisui.min.js' :
        //             ['<%= build_dirs.sisjs %>/lib/sis-js.js',
        //              '<%= build_dirs.src %>/app/js/app.js',
        //              '<%= build_dirs.src %>/app/js/components/*.js',
        //              '<%= build_dirs.build %>/pegjs/query.js',
        //              '<%= build_dirs.build %>/templates/partials.js',
        //              '<%= build_dirs.src %>/app/js/controllers/*.js'
        //             ]
        //     }
        // },
        vendor : {
            files : {
                // libs for the angular app
                '<%= build_dirs.build %>/app/vendor-libs.js' :
                    // order matters
                    ['<%= build_dirs.src %>/common/js/vendor/jquery/1.11.0/jquery-1.11.0.min.js',
                     '<%= build_dirs.src %>/common/js/vendor/angularjs/1.2.15/angular.min.js',
                     '<%= build_dirs.src %>/common/js/vendor/angularjs/1.2.15/angular-route.min.js',
                     '<%= build_dirs.src %>/common/js/vendor/ui.bootstrap/0.10.0/ui-bootstrap-tpls-0.10.0.min.js',
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
    { path : 'index', title : "SIS", out : 'index.html' },
    { path : 'rbac', title : "SIS RBAC" },
    { path : 'sharing', title : "SIS Data Sharing" }
  ];
  docs.forEach(function(conf) {
    var path = require('path');
    var doc = conf.path;
    grunt.config.set('sisswig.docs_' + doc, {
        // src -> dest
        src: ["<%= build_dirs.src %>/docs/docs.swig"],
        dest : "<%= build_dirs.dist %>/docs/" + conf.out || doc,
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
    // copy over config.js
    var files = grunt.config.get('copy.dist.files');
    files.push({ src : "<%= build_dirs.src %>/app/js/config.js",
                 dest : "<%= build_dirs.dist %>/app/js/config.js" });
    grunt.config.set('copy.dist.files', files);
    grunt.task.run(['build', 'connect:dist:keepalive']);
  });

  grunt.registerTask('build', [
    'clean',
    'jshint',
    'sismd',
    'peg',
    'ngtemplates',
    'uglify',
    'concat',
    'copy',
    'sisswig'
  ]);

  grunt.registerTask('default', ['newer:jshint','build']);


};