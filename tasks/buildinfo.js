/* task for generating html from sisdocs markdown */
module.exports = function(grunt) {
    'use strict';
    var path = require('path');
    grunt.registerTask('buildjson', function(target) {
        var options = this.options({ });
        var outfile = path.join(options.dest, 'build.json');
        var buildNum = process.env.BUILD_NUMBER || 'local-build';
        var githash = process.env.GIT_COMMIT_HASH || 'dev-hash';
        var buildId = process.env.BUILD_ID || grunt.template.date(Date.now(), 'yyyy-mm-dd_HH-MM-ss');

        var output = {
            build_num : buildNum,
            git_hash : githash,
            build_id : buildId,
            version : grunt.config.get('pkg.version')
        };
        output = JSON.stringify(output);
        grunt.file.write(outfile, output);
        if (target == 'dist') {
            // write to dist as well
            outfile = 'dist/' + outfile;
            grunt.file.write(outfile, output);
        }
    });
};
