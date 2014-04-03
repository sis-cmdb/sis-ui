(function() {
    "use strict";

    angular.module('sisui')
    .factory('SisUtil', function(SisUser) {
        // add some utilities to the client
        function getArrayDescriptor(arr, name) {
            var res = {
                type : "Array"
            };
            if (arr.length && arr[0]) {
                res.children = [normalizeDescriptor(arr[0], null)];
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
                        result.url = "#/entities/" + result.type;
                    }
                    return result;
                } else {
                    // check if it's an array
                    if (desc.type instanceof Array) {
                        var arrDesc = getArrayDescriptor(desc.type, name);
                        for (k in desc) {
                            if (k != 'type') {
                                arrDesc[k] = desc[k];
                            }
                        }
                        return arrDesc;
                    } else {
                        // type is an embedded schema or
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
            getInputType : _getInputType,
            descriptorTypes : _descriptorTypes,
            attributesForType : _getAttributesForType
        };
    });

})();