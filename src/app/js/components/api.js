// SIS API access
angular.module('sisui')
.factory('SisApi', function($location, API_URL, $q,
                            SisSession, $http) {
    "use strict";

    if (!API_URL) {
        var absUrl = $location.absUrl();
        // strip off the #
        var idx = absUrl.indexOf('#');
        if (idx != -1)
            absUrl = absUrl.substring(0, absUrl.indexOf('#'));

        API_URL = absUrl;
    }
    var client = SIS.client({'url' : API_URL, 'version' : 'v1.1' });

    var createCallback = function(d) {
        return function(err, result) {
            if (err) {
                d.reject(err);
            } else {
                d.resolve(result);
            }
        };
    };

    // returns a function that returns a promise
    // and wraps a function that takes in a callback
    // i.e. foo(bar, baz, callback) -> foo(bar, baz).then(...);
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
                k != 'commits' &&
                typeof endpoint[k] == 'function') {
                var func = endpoint[k];
                result[k] = wrapFunc(endpoint, func);
            }
        }
        // handle commits endpoint
        if (endpoint.commits) {
            result.commits = function(id) {
                var commitEndpoint = endpoint.commits(id);
                return wrapEndpoint(commitEndpoint);
            };
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
        };
        var endpoints = ['hooks', 'hiera', 'users', 'schemas'];
        for (var i = 0; i < endpoints.length; ++i) {
            this[endpoints[i]] = wrapEndpoint(client[endpoints[i]]);
        }

        // convenience methods that hit the session first
        // Get all the schemas sorted by name
        this.getAllSchemas = function() {
            var d = $q.defer();
            var schemas = SisSession.getSchemas();
            if (schemas) {
                d.resolve(schemas);
                return d.promise;
            }
            // need to query
            this.schemas.listAll({ sort : 'name' }).then(function(schemas) {
                // set the schemas
                SisSession.setSchemas(schemas);
                d.resolve(schemas);
            }, function(err) {
                d.reject(err);
            });
            return d.promise;
        };

        this.getSchema = function(name, setToCurrent) {
            var d = $q.defer();
            var currentSchema = SisSession.getCurrentSchema();
            if (currentSchema && currentSchema.name == name) {
                d.resolve(currentSchema);
                return d.promise;
            }
            // need to query
            this.schemas.get(name).then(function(schema) {
                d.resolve(schema);
                if (setToCurrent) {
                    SisSession.setCurrentSchema(schema);
                }
            }, function(err) {
                d.reject(err);
            });
            return d.promise;
        };

        this.getEntityWithSchema = function(entityId, schemaName, setToCurrent) {
            var d = $q.defer();
            var result = SisSession.getCurrentEntityAndSchemaIfMatches(schemaName, entityId);
            if (result) {
                d.resolve(result);
                return d.promise;
            }
            // need the schema first
            var self = this;
            this.getSchema(schemaName, setToCurrent).then(function(schema) {
                self.entities(schemaName).get(entityId).then(function(entity) {
                    if (setToCurrent) {
                        SisSession.setCurrentEntity(schema, entity);
                    }
                    d.resolve([schema, entity]);
                }, function(err) {
                    d.reject(err);
                });
            }, function(err) {
                d.reject(err);
            });
            return d.promise;
        };

        this.getHook = function(name, setToCurrent) {
            var d = $q.defer();
            var currentHook = SisSession.getCurrentHook();
            if (currentHook && currentHook.name == name) {
                d.resolve(currentHook);
                return d.promise;
            }
            // need to query
            this.hooks.get(name).then(function(hook) {
                d.resolve(hook);
                if (setToCurrent) {
                    SisSession.setCurrentHook(hook);
                }
            }, function(err) {
                d.reject(err);
            });
            return d.promise;
        };

        this.apiInfo = $http.get(API_URL + "/api/v1/info");
        this.uiInfo = $http.get("build.json");

    };

    return new Api();
});
