// controller for editing/creating schemas
angular.module('sisui')
.controller("SchemaModController", function($scope, $route, $location, $window,
                                            SisSession, SisUtil, SisApi) {
    "use strict";

    var init = function(schema) {
        SisApi.getAllSchemas().then(function(schemas) {
            $scope.schemaList = schemas;

            var ownerDescriptor = {
                name : "owner",
                required : true,
                type : "String"
            };
            var adminGroups = SisUtil.getAdminRoles();
            if (adminGroups instanceof Array) {
                ownerDescriptor.enum = adminGroups;
                ownerDescriptor.type = "Array";
            }

            $scope.schema = schema;
            $scope.schema.owner.sort();

            var schemaDefinitionDescriptor = { name : "definition", type : "Document" };
            var entityDescriptors = SisUtil.getDescriptorArray($scope.schema);

            entityDescriptors = entityDescriptors.map(function(ed) {
                ed._parent_ = schemaDefinitionDescriptor;
                return ed;
            }).filter(function(ed) {
                return ed.name !== "owner";
            });

            schemaDefinitionDescriptor.children = entityDescriptors;


            var descriptors = [
                { name : "name", type : "String", required : true, readonly : $scope.action == 'edit' },
                ownerDescriptor,
                { name : "sis_locked", type : "Boolean" },
                schemaDefinitionDescriptor
            ];

            var orig = angular.copy($scope.schema);
            $scope.descriptors = descriptors;

            // assumes all descriptors have a name
            var getMaxFieldName = function(descriptors) {
                return descriptors.reduce(function(max, desc) {
                    if (max < desc.name.length) {
                        max = desc.name.length;
                    }
                    return max;
                }, 0);
            };

            var maxFieldLen = getMaxFieldName(descriptors);

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

            $scope.hasChanged = function() {
                return !angular.equals(orig, $scope.schema);
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
        if (!($route.current && $route.current.params)) {
            return $location.path("/schemas");
        }
        var params = $route.current.params;
        var action = params.action;
        var schemaName = params.schema;
        if (action == 'add' && !schemaName) {
            // adding a schema
            $scope.action = action;
            $scope.title = "Add a new schema";
            init(createEmptySchema());
        } else if (action == 'edit' && schemaName) {
            SisApi.getSchema(schemaName, true).then(function(schema) {
                $scope.action = action;
                $scope.title = "Modify schema " + schemaName;
                // clone it
                init(angular.copy(schema));
            }, function(err) {
                return $location.path("/schemas");
            });
        } else {
            return $location.path("/schemas");
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
            return $location.path("/schemas");
        });
    };

    $scope.cancel = function() {
        SisUtil.goBack("/schemas");
    };

});


