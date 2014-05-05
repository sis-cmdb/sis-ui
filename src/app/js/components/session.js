// SIS API access
angular.module('sisui')
.factory('SisSession', function() {
    "use strict";

    function Session() {
        var cache = { };

        var set = function(key, value) {
            if (!value) {
                delete cache[key];
            } else {
                cache[key] = value;
            }
        };

        var get = function(key) {
            return cache[key];
        };

        this.clearAll = function() {
            cache = { };
        };


        // expose only helpers to ensure integrity
        this.setSchemas = function(schemas, ttl) {
            if (!schemas) { return set('schemas', null); }
            ttl = ttl || 60000;
            var expires = Date.now() + ttl;
            set('schemas', [schemas, expires]);
            this.setCurrentSchema(null);
        };

        this.getSchemas = function() {
            var schemas = get('schemas');
            if (!schemas) { return null; }
            if (schemas[1] > Date.now()) {
                return schemas[0];
            }
            this.setSchemas(null);
            return null;
        };

        this.setCurrentHook = function(hook) {
            set('current_hook', hook);
        };

        this.getCurrentHook = function() {
            return get('current_hook');
        };

        this.getCurrentSchema = function() {
            return get('current_schema');
        };

        this.setCurrentSchema = function(schema) {
            set('current_schema', schema);
        };

        this.setCurrentEntity = function(schema, entity) {
            this.setCurrentSchema(schema);
            set('current_entity', entity);
        };

        this.getCurrentEntityAndSchemaIfMatches = function(schemaName, entityId) {
            var schema = get('current_schema');
            if (!schema || schema.name != schemaName) {
                return null;
            }
            var entity = get('current_entity');
            if (!entity || entity._id != entityId) {
                return null;
            }
            return [schema, entity];
        };

        this.setObjectToCopy = function(type, obj) {
            set('add_new|' + type, obj);
        };

        this.getObjectToCopy = function(type) {
            var result = get('add_new|' + type) || { };
            set('add_new|' + type, null);
            Object.keys(result).forEach(function(k) {
                if (k[0] == '_') {
                    delete result[k];
                }
            });
            return result;
        };
    }

    return new Session();

});
