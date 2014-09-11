// modify an entity (or add)
angular.module('sisui')
.controller("EntityModController", function($scope, SisSession,
                                            SisUtil, SisApi) {
    var init = function(orig, action) {
        if (action == 'add') {
            if (!SisUtil.canAddEntity($scope.schema)) {
                return $scope.$state.go("^.list");
            }
        } else {
            if (!SisUtil.canManageEntity(orig, $scope.schema)) {
                return $scope.$state.go("^.list");
            }
        }

        $scope.showJson = false;
        var descriptors = [];
        var metaDescriptors = [];
        var schemaDescriptors = SisUtil.getDescriptorArray($scope.schema);
        // need to tweak this so owner and sis_locked show up..
        for (var i = 0; i < schemaDescriptors.length; ++i) {
            var desc = schemaDescriptors[i];
            if (desc.name == 'owner') {
                // convert owner into an enum
                var subset = SisUtil.getOwnerSubset($scope.schema);
                if (subset instanceof Array) {
                    desc.enum = subset;
                    desc.type = "Array";
                } else {
                    desc.type = "String";
                    desc.required = true;
                    delete desc.enum;
                }
                metaDescriptors.push(desc);
            } else {
                descriptors.push(desc);
            }
        }

        metaDescriptors = metaDescriptors.concat(SisUtil.getSisDescriptors());

        $scope.descriptors = descriptors;
        $scope.metaDescriptors = metaDescriptors;

        orig.sis_locked = orig.sis_locked || false;
        $scope.entity = angular.copy(orig);
        // for the valueChanged recursion
        $scope.fieldValue = $scope.entity;

        // assumes all descriptors have a name
        var getMaxFieldName = function(descriptors) {
            return descriptors.reduce(function(max, desc) {
                // either a name or a number label for an array
                var len = desc.name ? desc.name.length : 4;
                if (desc.children && desc.children.length) {
                    // is a container
                    if ($scope.action != 'view') {
                        // two buttons - dleete and collaps
                        len += 5;
                    } else {
                        len += 3;
                    }
                }
                if (max < len) {
                    max = len;
                }
                return max;
            }, 0);
        };

        var maxFieldLen = getMaxFieldName(descriptors.concat(metaDescriptors));

        $scope.maxFieldNameLength = function(descriptor, isItem) {
            if (!descriptor) {
                return 0;
            }
            if (isItem) {
                if ($scope.action != 'view') {
                    // delete + label
                    return 7;
                } else {
                    return 4;
                }
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
                return maxFieldLen;
            }
        };

        var hasChanged = function() {
            return !angular.equals(orig, $scope.entity);
        };

        $scope.canSave = function() {
            return hasChanged() && $scope.entityMod.$valid;
        };
    };

    var parseRoute = function() {
        var eid = $scope.$stateParams.eid;
        var action = eid ? "edit" : "add";
        var schemaName = $scope.$stateParams.schema;
        if (action == 'add' && !eid) {
            // adding.. just need the schema
            SisApi.getSchema(schemaName, true).then(function(schema) {
                $scope.schema = schema;
                $scope.action = action;
                $scope.title = "Add a new entity of type " + schemaName;
                var obj = SisSession.getObjectToCopy(schemaName);
                init({ }, action);
                obj.owner = [];
                $scope.entity = obj;
                $scope.fieldValue = $scope.entity;
            }, function(err) {
                return $scope.$state.go("^.list");
            });
        } else if (action == 'edit' && eid) {
            SisApi.getEntityWithSchema(eid, schemaName, true).then(function(res) {
                $scope.schema = res[0];
                var idField = SisUtil.getIdField(res[0]);
                $scope.action = action;
                $scope.title = "Modify entity of type " + schemaName + " - " + res[1][idField];
                init(angular.copy(res[1]), action);
            }, function(err) {
                return $scope.$state.go("^.list");
            });
        } else {
            return $scope.$state.go("^.list");
        }
    };

    $scope.save = function() {
        var schemaName = $scope.schema.name;
        var endpoint = SisApi.entities(schemaName);
        var func = endpoint.create;
        if ($scope.action == 'edit') {
            func = endpoint.update;
        }
        func($scope.entity).then(function(res) {
            SisSession.setCurrentEntity($scope.schema, null);
            SisUtil.goBack("^.list");
        });
    };

    $scope.cancel = function() {
        SisUtil.goBack("^.list");
    };

    parseRoute();

});
