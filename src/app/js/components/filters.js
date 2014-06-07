angular.module('sisui')
.filter("expireTime", function() {
    "use strict";
    return function(expiresSecs) {
        var secs = parseInt(expiresSecs, 10);
        if (isNaN(secs) || secs === 0) {
            return "Expired.";
        }
        return moment(Date.now() + secs).fromNow();
    };
})
.filter('momentUTC', function() {
    "use strict";
    return function(utcTime, format) {
        utcTime = parseInt(utcTime, 10);
        var m = moment(new Date(utcTime));
        if (!format) {
            return m.fromNow();
        } else {
            return m.format(format);
        }
    };
});
