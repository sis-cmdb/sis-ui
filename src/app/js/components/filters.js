angular.module('sisui')
.filter("moment", function() {
    "use strict";
    return function(expiresSecs) {
        var secs = parseInt(expiresSecs, 10);
        if (isNaN(secs) || secs === 0) {
            return "Expired.";
        }
        return moment(Date.now() + secs).fromNow();
    };
});
