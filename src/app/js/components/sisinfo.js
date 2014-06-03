angular.module('sisui')
.factory('SisInfo', function($http, API_URL, $q) {
    "use strict";

    if (!API_URL) {
        var absUrl = $location.absUrl();
        // strip off the #
        var idx = absUrl.indexOf('#');
        if (idx != -1)
            absUrl = absUrl.substring(0, absUrl.indexOf('#'));

        API_URL = absUrl;
    }

    return {
        apiInfo : $http.get(API_URL + '/api/v1/info'),
        uiInfo : $http.get("build.json")
    };

});
