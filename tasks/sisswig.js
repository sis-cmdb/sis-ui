/* task for generating html from swig template */
module.exports = function(grunt) {
    'use strict';
    var swig = require('swig');
    grunt.registerMultiTask('sisswig', "HTML from SWIG", function() {
        var data = this.data;
        data.context = data.context || {};
        var options = this.options({ });
        if (options.swigDefaults) {
            swig.setDefaults(options.swigDefaults);
        }
        this.files.forEach(function(file) {
            var paths = file.src.filter(function(path) {
                if (!grunt.file.isFile(path)) {
                    grunt.log.warn("File does not exist. %s", path);
                    return false;
                }
                return true;
            });
            if (paths.length != 1) {
                grunt.log.warn("Only one file at a time.");
                return false;
            }
            var dest = file.dest;
            var template = grunt.file.read(paths[0]);
            var output = swig.render(template, { locals : data.context });
            grunt.file.write(dest, output);
        });
    });
};
