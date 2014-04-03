(function() {
    "use strict";
    angular.module('sisui')
    .factory("SisUser", function(SisApi, $q, $rootScope) {
        var USER_KEY = "t";

        var isExpired = function(currentUser) {
            return !(currentUser &&
                     currentUser.expirationTime &&
                     currentUser.expirationTime > Date.now());
        };

        return {
            isLoggedIn : function() {
                if (!(USER_KEY in localStorage)) {
                    return false;
                }
                var currentUser = angular.fromJson(localStorage[USER_KEY]);
                var expired = isExpired(currentUser);
                if (expired) {
                    // cleanup
                    SisApi.setAuthToken(null);
                    delete localStorage[USER_KEY];
                } else {
                    // ensure sis client token is set
                    SisApi.setAuthToken(currentUser.token);
                }
                return !expired;
            },
            getCurrentUser : function() {
                var data = localStorage[USER_KEY];
                if (data) {
                    // ensure not expired
                    var user = angular.fromJson(data);
                    if (isExpired(user)) {
                        // cleanup
                        SisApi.setAuthToken(null);
                        delete localStorage[USER_KEY];
                        user = null;
                    }
                    return user;
                }
                return null;
            },
            logout : function() {
                var d = $q.defer();
                if (!this.isLoggedIn()) {
                    d.resolve(true);
                    return d.promise;
                }
                var username = this.getCurrentUser().username;
                SisApi.tokens(username).delete(SisApi.getAuthToken()).then(function() {
                    // ignore errors
                    SisApi.setAuthToken(null);
                    delete localStorage[USER_KEY];
                    d.resolve(true);
                    $rootScope.$broadcast("loggedIn", false);
                });
                return d.promise;
            },
            login : function(username, password) {
                var d = $q.defer();
                this.logout().then(function() {
                    SisApi.authenticate(username, password).then(function(token) {
                        if (!token) {
                            return d.reject("Authentication failed.");
                        }
                        // get the user details
                        SisApi.users.get(username).then(function(user) {
                            var data = {
                                username : username,
                                super_user : user.super_user,
                                roles : user.roles,
                                expirationTime : Date.now() + token.expires,
                                token : token.name
                            };
                            localStorage[USER_KEY] = angular.toJson(data);
                            d.resolve(data);
                            $rootScope.$broadcast("loggedIn", true);
                        });
                    });
                });
                return d.promise;
            }
        };
    });
})();