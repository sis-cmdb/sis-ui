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
        localStorage.removeItem(USER_KEY);
        $rootScope.$broadcast("loggedIn", false);
    };

    var getUser = function() {
        var str = localStorage.getItem(USER_KEY);
        if (!str) {
            return null;
        }
        return angular.fromJson(str);
    };

    var setUser = function(user) {
        localStorage.setItem(USER_KEY, angular.toJson(user));
    };

    return {
        isLoggedIn : function() {
            var currentUser = getUser();
            if (!currentUser) {
                return false;
            }
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
            var user = getUser();
            if (user) {
                // ensure not expired
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
                        setUser(data);
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
