// SIS User information.  Evolve into settings
angular.module('sisui')
.factory("SisUser", function(SisApi, $q, $rootScope) {
    "use strict";
    var USER_KEY = "t";

    var isExpired = function(currentUser) {
        return !(currentUser &&
                 currentUser.expirationTime &&
                 currentUser.expirationTime > Date.now());
    };

    var cleanup = function() {
        // cleanup
        SisApi.setAuthToken(null);
        delete localStorage[USER_KEY];
        $rootScope.$broadcast("loggedIn", false);
    };

    return {
        isLoggedIn : function() {
            if (!(USER_KEY in localStorage)) {
                return false;
            }
            var currentUser = angular.fromJson(localStorage[USER_KEY]);
            var expired = isExpired(currentUser);
            if (expired) {
                cleanup();
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
                    user = null;
                    cleanup();
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
            cleanup();
            SisApi.tokens(username).delete(SisApi.getAuthToken()).then(function() {
                // ignore errors
                d.resolve(true);
            }, function() {
                d.resolve(false);
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
        },
        verify : function() {
            var user = this.getCurrentUser();
            var self = this;
            if (user) {
                SisApi.tokens(user.username).list({ limit : 1 }).then(function(token) {
                    // good to go
                }, function(err) {
                    // logout - something bad
                    self.logout();
                });
            }
        }
    };
});
