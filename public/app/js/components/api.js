(function() {
    "use strict";
    // SIS Client factory
    angular.module('sisui')
    .factory('SisApi', function($location, API_URL, $q) {
        if (!API_URL) {
            var absUrl = $location.absUrl();
            // strip off the #
            var idx = absUrl.indexOf('#');
            if (idx != -1)
                absUrl = absUrl.substring(0, absUrl.indexOf('#'));

            API_URL = absUrl;
        }
        var client = SIS.client({'url' : API_URL });

        var createCallback = function(d) {
            return function(err, result) {
                if (err) {
                    d.reject(err);
                } else {
                    d.resolve(result);
                }
            };
        };

        var wrapFunc = function(endpoint, func) {
            return function() {
                var d = $q.defer();
                var args = Array.prototype.slice.call(arguments, 0);
                args.push(createCallback(d));
                func.apply(endpoint, args);
                return d.promise;
            };
        };

        var wrapEndpoint = function(endpoint) {
            var result = { };
            for (var k in endpoint) {
                if (endpoint.hasOwnProperty(k) &&
                    typeof endpoint[k] == 'function') {
                    var func = endpoint[k];
                    result[k] = wrapFunc(endpoint, func);
                }
            }
            return result;
        };

        var Api = function() {
            this.authenticate = function(username, password) {
                var d = $q.defer();
                client.authenticate(username, password, createCallback(d));
                return d.promise;
            };
            this.entities = function(name) {
                return wrapEndpoint(client.entities(name));
            };
            this.tokens = function(username) {
                return wrapEndpoint(client.tokens(username));
            };
            this.setAuthToken = function(token) {
                client.authToken = token;
            };
            this.getAuthToken = function() {
                return client.authToken;
            }
            var endpoints = ['hooks', 'schemas', 'hiera', 'users'];
            for (var i = 0; i < endpoints.length; ++i) {
                this[endpoints[i]] = wrapEndpoint(client[endpoints[i]]);
            }
        };

        return new Api();
    });
})();
