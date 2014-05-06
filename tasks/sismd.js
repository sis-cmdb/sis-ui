/* task for generating html from sisdocs markdown */
module.exports = function(grunt) {
    'use strict';
    var marked = require('marked');
    var hljs = require('highlight.js');
    marked.setOptions({
        breaks : true,
        highlight: function(code, lang) {
            var result =  hljs.highlight(lang, code).value;
            return result;
        }
    });

    grunt.registerMultiTask('sismd', "Converts SIS-web markdown to html", function() {
        var options = this.options({ });
        this.files.forEach(function(file) {
            var data = file.src.filter(function(path) {
                if (!grunt.file.isFile(path)) {
                    grunt.log.warn("File does not exist. %s", source);
                    return false;
                }
                return true;
            }).map(function(path) {
                return grunt.file.read(path);
            }).join("\n");
            var dest = file.dest;
            if (options.preprocess) {
                data = options.preprocess(data);
            }
            var output = marked(data);
            grunt.file.write(dest, output);
        });
    });
};
