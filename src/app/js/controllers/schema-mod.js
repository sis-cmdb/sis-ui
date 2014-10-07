// controller for editing/creating schemas
angular.module('sisui')
.controller("SchemaModController", function($scope, SisSession,
                                            SisUtil, SisApi) {
    "use strict";

    var init = function(schema) {
        $scope.showJson = false;
        SisApi.getAllSchemas().then(function(schemas) {
            $scope.schemaList = schemas;

            var ownerDescriptor = {
                name : "owner",
                type : "String"
            };
            if (schema.is_public || schema.is_open) {
                ownerDescriptor.required = true;
            } else {
                var adminGroups = SisUtil.getAdminRoles();
                if (adminGroups instanceof Array) {
                    ownerDescriptor.enum = adminGroups;
                    ownerDescriptor.type = "Array";
                } else {
                    ownerDescriptor.required = true;
                }
            }

            $scope.schema = schema;
            $scope.schema.owner.sort();

            var schemaDefinitionDescriptor = { name : "definition", type : "Document" };
            var entityDescriptors = SisUtil.getDescriptorArray($scope.schema);

            entityDescriptors = entityDescriptors.map(function(ed) {
                ed._parent_ = schemaDefinitionDescriptor;
                if ($scope.action == "add") {
                    ed._isNew_ = true;
                }
                return ed;
            }).filter(function(ed) {
                return ed.name !== "owner";
            });

            schemaDefinitionDescriptor.children = entityDescriptors;

            var descriptors = [
                { name : "name", type : "String", required : true, readonly : $scope.action == 'edit', match : '/^[0-9a-z_]+$/' },
                { name : "description", type : "String" },
                { name : "locked_fields", type : "String" },
                { name : "is_open", type : "Boolean" },
                { name : "is_public", type : "Boolean" },
                { name : "id_field", type : "String" },
                { name : "any_owner_can_modify", type : "Boolean" },
                { name : "track_history", type : "Boolean" },
                schemaDefinitionDescriptor
            ];

            var metaDescriptors = SisUtil.getSisDescriptors();
            metaDescriptors.push(ownerDescriptor);

            var orig = angular.copy($scope.schema);
            $scope.descriptors = descriptors;
            $scope.metaDescriptors = metaDescriptors;
            $scope.originalLockedFields = orig.locked_fields || [];

            // assumes all descriptors have a name
            var getMaxFieldName = function(descriptors) {
                return descriptors.reduce(function(max, desc) {
                    var len = 0;
                    if (desc._isNew_) {
                        len = 15;
                    } else {
                        len = desc.name.length;
                    }
                    if (max < len) {
                        max = len;
                    }
                    return max;
                }, 0);
            };

            var maxFieldLen = getMaxFieldName(descriptors.concat(metaDescriptors));

            $scope.maxFieldNameLength = function(descriptor) {
                if (!descriptor) {
                    return 0;
                }
                if (descriptor._parent_) {
                    if (descriptor._parent_._max_field_len_) {
                        return descriptor._parent_._max_field_len_;
                    }
                    if (descriptor._parent_.type == "Document") {
                        descriptor._parent_._max_field_len_ = getMaxFieldName(descriptor._parent_.children);
                    } else {
                        // array - just return something for 9999 elems
                        descriptor._parent_._max_field_len_ = 4;
                    }
                    return descriptor._parent_._max_field_len_;
                } else {
                    // root
                    return maxFieldLen;
                }
            };

            var hasChanged = function() {
                return !angular.equals(orig, $scope.schema);
            };

            $scope.canSave = function() {
                return $scope.schemaMod.$valid && hasChanged();
            };

            $scope.lockAllFields = function() {
                var paths = [];
                var getPaths = function(descriptor) {
                    var result = [];
                    var path = SisUtil.getDescriptorPath(descriptor);
                    // remove the definition part
                    path.shift();
                    result.push(path.join("."));
                    if (descriptor.children && descriptor.type == "Document") {
                        descriptor.children.forEach(function(d) {
                            result = result.concat(getPaths(d));
                        });
                    }
                    return result;
                };
                var children = schemaDefinitionDescriptor.children;
                children.forEach(function(d) {
                    paths = paths.concat(getPaths(d));
                });
                // set it
                $scope.schema.locked_fields = paths;
                // broadcast
                $scope.$broadcast("locked_fields_updated");
            };
        });
    };

    var createEmptySchema = function() {
        return {
            name : "",
            owner : [],
            definition : {
                name : "String"
            },
            sis_locked : false,
            locked_fields : []
        };
    };

    var parseRoute = function() {
        var params = $scope.$stateParams;
        var schemaName = params.schema;
        var action = schemaName ? 'edit' : 'add';
        if (action == 'add' && !schemaName) {
            if (!(SisUtil.getAdminRoles())) {
                return $scope.$state.go("app.schemas.list");
            }
            // adding a schema
            $scope.action = action;
            $scope.title = "Add a new schema";
            init(createEmptySchema());
        } else if (action == 'edit' && schemaName) {
            SisApi.getSchema(schemaName, true).then(function(schema) {
                if (!SisUtil.canManageSchema(schema)) {
                    return $scope.$state.go("app.schemas.list");
                }
                $scope.action = action;
                $scope.title = "Modify schema " + schemaName;
                // clone it
                init(angular.copy(schema));
            }, function(err) {
                return $scope.$state.go("app.schemas.list");
            });
        } else {
            return $scope.$state.go("app.schemas.list");
        }
    };

    parseRoute();

    $scope.save = function() {
        var endpoint = SisApi.schemas;
        var name = $scope.schema.name;
        var func = endpoint.create;
        if ($scope.action === 'edit') {
            func = endpoint.update;
        }
        func($scope.schema).then(function(res) {
            SisSession.setSchemas(null);
            return $scope.$state.go("app.schemas.list");
        });
    };

    $scope.cancel = function() {
        SisUtil.goBack("/schemas");
    };

});
