// SIS User information.  Evolve into settings
angular.module('sisui')
.factory("SisUser", function(SisApi, $q, $rootScope, $window) {
    "use strict";
    var USER_KEY = "t";
    // how long a UI login with a persistent (non expiring) token lasts
    var PERSISTENT_TOKEN_SESSION_MS = 8 * 60 * 60 * 1000;

    // Session tokens from POST /users/auth_token are JWTs (three dot separated
    // parts). Persistent tokens are opaque strings stored by the API.
    var isSessionToken = function(token) {
        return typeof token === 'string' && token.split('.').length === 3;
    };

    // expiration of a session token in ms since the epoch, or null
    var sessionExpiration = function(token) {
        try {
            var payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
            while (payload.length % 4) {
                payload += '=';
            }
            var claims = angular.fromJson($window.atob(payload));
            return typeof claims.exp === 'number' ? claims.exp * 1000 : null;
        } catch (ex) {
            return null;
        }
    };

    // the API rejected the token itself (as opposed to being unreachable)
    var isInvalidTokenError = function(err) {
        return !!err && (err.status === 401 || err.status === 404);
    };

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

    // Checks a token with the API and resolves with its expiration time.
    var checkToken = function(username, token) {
        SisApi.setAuthToken(token);
        var tokens = SisApi.tokens(username);
        if (isSessionToken(token)) {
            // session tokens are not stored by the API, so make an authenticated
            // request to validate it. The expiration is in the token itself.
            return tokens.list({ limit : 1 }).then(function() {
                return sessionExpiration(token) || Date.now() + PERSISTENT_TOKEN_SESSION_MS;
            });
        }
        return tokens.get(token).then(function(result) {
            if (!result) {
                return $q.reject({ status : 404, error : "Token is invalid." });
            }
            // persistent tokens have no expiration
            return Date.now() + (result.expires || PERSISTENT_TOKEN_SESSION_MS);
        });
    };

    // Stores the logged in user and tells the rest of the app.
    var storeUser = function(username, token, expirationTime) {
        return SisApi.users.get(username).then(function(user) {
            var data = {
                username : user.name,
                super_user : user.super_user,
                roles : user.roles,
                expirationTime : expirationTime,
                token : token
            };
            setUser(data);
            $rootScope.$broadcast("loggedIn", true);
            return data;
        });
    };

    return {
        isSessionToken : isSessionToken,
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
        // Resolves true once the user is logged out locally and, for session
        // tokens, false if the API could not end the session.
        logout : function() {
            if (!this.isLoggedIn()) {
                return $q.when(true);
            }
            var token = SisApi.getAuthToken();
            cleanup();
            if (!isSessionToken(token)) {
                // a persistent token belongs to whoever issued it (e.g. an app
                // embedding the UI), so only forget it here
                return $q.when(true);
            }
            return SisApi.endSession(token).then(function() {
                return true;
            }, function() {
                return false;
            });
        },
        login : function(username, password) {
            return this.logout().then(function() {
                return SisApi.authenticate(username, password).catch(function(err) {
                    return $q.reject("An error occurred: " + (err && err.error || err));
                });
            }).then(function(token) {
                if (!token) {
                    return $q.reject("Authentication failed.");
                }
                var expirationTime = sessionExpiration(token.name) || Date.now() + token.expires;
                return storeUser(username, token.name, expirationTime);
            });
        },
        // Checks the stored login with the API. Resolves with the user, or null
        // if nobody is logged in or the API rejected the token.
        verify : function() {
            var user = this.getCurrentUser();
            if (!user) {
                return $q.when(null);
            }
            return checkToken(user.username, user.token).then(function(expirationTime) {
                return storeUser(user.username, user.token, expirationTime);
            }, function(err) {
                if (isInvalidTokenError(err)) {
                    cleanup();
                    return null;
                }
                // API unavailable - keep the login and try again next time
                return user;
            });
        },
        loginWithToken : function(username, token) {
            return this.logout().then(function() {
                return checkToken(username, token);
            }).then(function(expirationTime) {
                return storeUser(username, token, expirationTime);
            }).catch(function(err) {
                SisApi.setAuthToken(null);
                return $q.reject(err);
            });
        }
    };
});
