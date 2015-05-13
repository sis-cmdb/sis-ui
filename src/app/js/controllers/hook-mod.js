// modify a hook (or add)
angular.module('sisui')
.controller("HookModController", function($scope, SisSession,
                                          SisUtil, SisApi, SisDialogs) {
    var init = function(orig) {
        if (!SisUtil.canManageEntity(orig, $scope.schema)) {
            return $scope.$state.go("^.list");
        }

        var descriptors = SisUtil.getDescriptorArray($scope.schema);
        // sis meta for v1.1
        var metaDescriptor = SisUtil.getSisMetaDescriptor();
        // need to tweak the owner
        var ownerDesc = metaDescriptor.children.filter(function(desc) {
            return desc.name === 'owner';
        })[0];
        var ownerSubset = SisUtil.getOwnerSubset($scope.schema);
        if (ownerSubset instanceof Array) {
            ownerDesc.enum = ownerSubset;
            ownerDesc.type = "Array";
        } else {
            ownerDesc.type = "String";
            ownerDesc.required = true;
            delete ownerDesc.enum;
        }

        $scope.descriptors = descriptors;
        $scope.metaDescriptors = [metaDescriptor];

        $scope.entity = angular.copy(orig);
        // for the valueChanged recursion
        $scope.fieldValue = $scope.entity;

        $scope.canSave = function() {
            return !angular.equals(orig, $scope.entity) && $scope.entityMod.$valid;
        };

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

        var maxFieldLen = getMaxFieldName(descriptors.concat($scope.metaDescriptors));

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
    };

    var parseRoute = function() {
        var params = $scope.$stateParams;
        var hookId = params.id;
        var action = hookId ? "edit" : "add";
        var schema = SisUtil.getHookSchema();
        if (action == 'add' && !hookId) {
            // adding..
            $scope.schema = schema;
            $scope.action = action;
            $scope.title = "Add a new hook";
            var obj = SisSession.getObjectToCopy(schema.name) || { };
            obj._sis = { owner : [], tags : [] };
            init(obj);
        } else if (action == 'edit' && hookId) {
            SisApi.getHook(hookId).then(function(res) {
                $scope.schema = schema;
                $scope.action = action;
                $scope.title = "Modify hook " + hookId;
                init(res);
            }, function(err) {
                return $scope.$state.go("^.list");
            });
        } else {
            return $scope.$state.go("^.list");
        }
    };

    $scope.save = function() {
        var schemaName = $scope.schema.name;
        var endpoint = SisApi.hooks;
        var func = endpoint.create;
        if ($scope.action == 'edit') {
            func = endpoint.update;
        }
        func($scope.entity).then(function(res) {
            SisSession.setCurrentHook(null);
            $scope.$state.go("^.list");
        }).catch(function(err) {
            SisDialogs.showErrorDialog(null, err.error);
        });
    };

    $scope.cancel = function() {
        SisUtil.goBack("^.list");
    };

    parseRoute();

});
