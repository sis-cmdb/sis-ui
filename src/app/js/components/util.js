// Utility methods
angular.module('sisui')
.factory('SisUtil', function($window, $location, SisUser) {
    "use strict";

    // Pager class
    function EndpointPager(endpoint, scope, opts) {

        var parseSearch = function(search) {
            if (!search) {
                return null;
            }
            return null;
        };

        var self = this;
        // init
        scope.totalItems = 0;
        scope.currentPage = 1;
        // opts/defaults
        opts = opts || { };
        scope.pageSize = opts.pageSize || 20;
        var sortField = opts.sortField || null;
        var searchQuery = parseSearch(opts.search);
        var itemsField = opts.itemsField || 'items';

        this.setSearch = function(search) {
            searchQuery = parseSearch(search);
            this.loadPage();
        };

        this.setSort = function(sort) {
            sortField = sort;
            this.loadPage();
        };

        this.loadPage = function() {
            var query = {
                limit : scope.pageSize,
                offset: (scope.currentPage - 1) * scope.pageSize
            };
            if (sortField) {
                query.sort = sortField;
            }
            if (searchQuery) {
                query.q = searchQuery;
            }
            endpoint.list(query).then(function(items) {
                scope.totalItems = items.total_count;
                scope[itemsField] = items.results;
            });
        };

        // attach some scope methods
        this.setPage = function(pageNum) {
            scope.currentPage = pageNum;
        };

        scope.$watch('currentPage', function(newVal, oldVal) {
            if (newVal != oldVal || !scope[itemsField]) {
                self.loadPage();
            }
        });
        scope.setPage = this.setPage.bind(this);
    }

    // add some utilities to the client
    function getArrayDescriptor(arr, name) {
        var res = {
            type : "Array"
        };
        if (arr.length && arr[0]) {
            res.children = [normalizeDescriptor(arr[0], null)];
            if (res.children[0].enum) {
                res.enum = res.children[0].enum;
                delete res.children[0].enum;
            }
        } else {
            res.children = [{ "type" : "Mixed" }];
        }
        if (name) {
            res.name = name;
        }
        res.children.map(function(c) {
            c._parent_ = res;
        });
        return res;
    }

    function fixChildren(desc) {
        desc.children.map(function(c) {
            c._parent_ = desc;
        });
        desc.children.sort(function(c1, c2) {
            if (c1.name < c2.name) { return -1 ;}
            else if (c1.name > c2.name) { return 1 ;}
            return 0;
        });
    }

    function normalizeDescriptor(desc, name) {
        var k, inner = null;
        if (desc instanceof Array) {
            return getArrayDescriptor(desc, name);
        } else if (typeof desc === "string") {
            return { type : desc, name : name };
        } else if ('type' in desc) {
            if (typeof desc.type === "string") {
                var result = {
                    name : name
                };
                for (k in desc) {
                    result[k] = desc[k];
                }
                if (desc.type == "ObjectId" && desc.ref) {
                    result.type = desc.type;
                    result.ref = desc.ref;
                    result.url = "#/entities/" + result.ref;
                }
                return result;
            } else {
                // check if it's an array
                if (desc.type instanceof Array) {
                    inner = getArrayDescriptor(desc.type, name);
                    for (k in desc) {
                        if (k != 'type') {
                            inner[k] = desc[k];
                        }
                    }
                    return inner;
                } else {
                    // desc.type is an object
                    if (typeof desc.type.type === "string") {
                        // this implies that desc.type
                        // is a descriptor and desc itself
                        // is an embedded schema
                        inner = {
                            name : name,
                            type : "Document",
                            children : getDescriptors(desc)
                        };
                        fixChildren(inner);
                        return inner;
                    } else {
                        // desc.type is the embedded schema
                        // definition
                        inner = {
                            name : name,
                            type : "Document",
                            children : getDescriptors(desc.type)
                        };
                        fixChildren(inner);
                        for (k in desc) {
                            if (k != 'type') {
                                inner[k] = desc[k];
                            }
                        }
                        return inner;
                    }
                }
            }
        } else {
            // embedded scema
            inner = {
                name : name,
                type : "Document",
                children : getDescriptors(desc)
            };
            inner.children.map(function(c) {
                c._parent_ = inner;
            });
            return inner;
        }
    }

    function _getPathForDesc(desc) {
        var paths = [];
        while (desc) {
            if (desc.name) {
                paths.push(desc.name);
            } else {
                paths.push('_0');
            }
            desc = desc._parent_;
        }
        paths.reverse();
        return paths;
    }


    function getDescriptors(defn) {
        if (!defn) { return []; }
        var result = [];
        for (var k in defn) {
            var desc = defn[k];
            var normalized = normalizeDescriptor(desc, k);
            result.push(normalized);
        }
        result.sort(function(c1, c2) {
            if (c1.name < c2.name) { return -1 ;}
            else if (c1.name > c2.name) { return 1 ;}
            return 0;
        });
        return result;
    }

    var _canAddEntityForSchema = function(schema) {
        var user = SisUser.getCurrentUser();
        if (!user) {
            return false;
        }
        if (user.super_user) { return true; }
        var roles = user.roles || { };
        var owner = schema.owner;
        for (var i = 0; i < owner.length; ++i) {
            if (owner[i] in roles) {
                return true;
            }
        }
        return false;
    };

    var _getAdminRoles = function() {
        var user = SisUser.getCurrentUser();
        if (!user) {
            return null;
        }
        if (user.super_user) {
            return true;
        }
        var roles = user.roles || { };
        var result = [];
        for (var k in roles) {
            if (roles[k] == 'admin') {
                result.push(k);
            }
        }
        return result;
    };

    var _getAllRoles = function() {
        var user = SisUser.getCurrentUser();
        if (!user) {
            return [];
        }
        if (user.super_user) {
            return true;
        }
        var roles = user.roles || { };
        return Object.keys(roles);
    };

    var _getOwnerSubset = function(schema) {
        var user = SisUser.getCurrentUser();
        if (!user) {
            return [];
        }
        if (user.super_user) {
            return schema.owner;
        }
        var roles = user.roles || { };
        var subset = schema.owner.filter(function(o) {
            return o in roles;
        });
        return subset;
    };

    var _canDelete = function(obj) {
        return obj && !obj.sis_locked;
    };

    var _canManageEntity = function(entity, schema) {
        var user = SisUser.getCurrentUser();
        if (!user) {
            return false;
        }
        if (user.super_user) { return true; }
        var roles = user.roles || { };
        var owner = entity.owner || schema.owner;
        for (var i = 0; i < owner.length; ++i) {
            var group = owner[i];
            if (!roles[group]) {
                return false;
            }
        }
        return true;
    };

    var _canManageSchema = function(schema) {
        var user = SisUser.getCurrentUser();
        if (!user) {
            return false;
        }
        if (user.super_user) { return true; }
        var roles = user.roles || { };
        for (var i = 0; i < schema.owner.length; ++i) {
            var group = schema.owner[i];
            if (roles[group] != 'admin') {
                return false;
            }
        }
        return true;
    };

    var _getIdField = function(schema) {
        var defn = schema.definition;
        for (var k in defn) {
            if (typeof defn[k] === 'object') {
                var descriptor = defn[k];
                if (typeof(descriptor.type) === "string" &&
                    descriptor.type == "String" &&
                    descriptor.required &&
                    descriptor.unique) {
                    // found a required, unique string
                    return k;
                }
            }
        }
        var result = "_id";
        if ('name' in defn) {
            result = "name";
        } else if ("title" in defn) {
            result = "title";
        }
        return result;
    };

    var _getNewItemForDesc = function(desc) {
        if (desc.type == "Document") {
            return { };
        } else if (desc.type == "Array") {
            return [];
        } else {
            return "";
        }
    };

    var _getInputType = function(type) {
        switch (type) {
            case "Boolean":
                return "checkbox";
            case "Number":
                return "number";
            default:
                return "text";
        }
    };

    var _descriptorTypes = ["Boolean", "String", "Number", "Mixed",
                            "Document", "Array", "ObjectId"];

    var _getAttributesForType = function(type) {
        var result = [
            {name : 'required', type : 'checkbox'},
            {name : 'unique', type : 'checkbox'}
        ];
        switch (type) {
            case "Number":
                result.push({ name : "min", type : "number" });
                result.push({ name : "max", type : "number" });
                break;
            case "String":
                result.push({ name : "lowercase", type : "checkbox" });
                result.push({ name : "trim", type : "checkbox" });
                result.push({ name : "uppercase", type : "checkbox" });
                result.push({ name : "enum", type : "textArray" });
                break;
            case "ObjectId":
                result.push({ name : "ref", type : "select", values : "schemaList" });
                break;
            default:
                break;
        }
        return result;
    };

    var _getHookSchema = function() {
        return {
            name : "sis_hooks",
            owner : _getAllRoles(),
            definition : {
                name : { type : "String", required : true, unique : true },
                target : {
                        type : {
                            url : { type : "String", required : true },
                            action : { type : "String", required : true, enum : ["GET", "POST", "PUT"]}
                        },
                        required : true
                },
                retry_count : { type : "Number", min : 0, max : 20, "default" : 0 },
                retry_delay : { type : "Number", min : 1, max : 60, "default" : 1 },
                events : { type : [{ type : "String", enum : ["insert", "update", "delete"] }], required : true },
                owner : { type : ["String"] },
                entity_type : "String"
            }
        };
    };

    var _goBack = function(pathIfNotPresent) {
        if ($window.history.length) {
            $window.history.back();
        } else {
            $location.path(pathIfNotPresent);
        }
    };

    return {
        getDescriptorArray : function(schema) {
            return getDescriptors(schema.definition);
        },
        getIdField : _getIdField,
        canManageEntity : _canManageEntity,
        canManageSchema : _canManageSchema,
        canAddEntity : _canAddEntityForSchema,
        getDescriptorPath : _getPathForDesc,
        getNewItemForDesc : _getNewItemForDesc,
        canDelete : _canDelete,
        getOwnerSubset : _getOwnerSubset,
        getAdminRoles : _getAdminRoles,
        getAllRoles : _getAllRoles,
        getInputType : _getInputType,
        descriptorTypes : _descriptorTypes,
        attributesForType : _getAttributesForType,
        getHookSchema : _getHookSchema,
        EndpointPager : EndpointPager,
        goBack : _goBack
    };
});
