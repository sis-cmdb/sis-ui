// modify a hook (or add)
angular.module('sisui')
.controller("HookModController", function($scope, $route, $location,
                                          SisSession, SisUtil, SisApi) {
    var init = function(orig) {
        if (!SisUtil.canManageEntity(orig, $scope.schema)) {
            return $location.path("/hooks");
        }
        $scope.descriptors = SisUtil.getDescriptorArray($scope.schema);
        // need to tweak this so owner and sis_locked show up..
        var foundLocked = false;
        for (var i = 0; i < $scope.descriptors.length; ++i) {
            var desc = $scope.descriptors[i];
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
            } else if (desc.name == 'sis_locked') {
                foundLocked = true;
            }
        }
        if (!foundLocked) {
            $scope.descriptors.push({
                name : "sis_locked",
                type : "Boolean"
            });
        }
        orig.sis_locked = orig.sis_locked || false;
        $scope.entity = angular.copy(orig);
        // for the valueChanged recursion
        $scope.fieldValue = $scope.entity;

        $scope.hasChanged = function() {
            return !angular.equals(orig, $scope.entity);
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

        var maxFieldLen = getMaxFieldName($scope.descriptors);

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
        if (!($route.current && $route.current.params)) {
            return $location.path("/hooks");
        }
        var params = $route.current.params;
        var action = params.action;
        var hookId = params.hid;
        var backPath = "/hooks";
        var schema = SisUtil.getHookSchema();
        if (action == 'add' && !hookId) {
            // adding..
            $scope.schema = schema;
            $scope.action = action;
            $scope.title = "Add a new hook";
            var obj = SisSession.getObjectToCopy(schema.name);
            init({ });
            obj.owner = [];
            $scope.entity = obj;
            $scope.fieldValue = $scope.entity;
        } else if (action == 'edit' && hookId) {
            SisApi.getHook(hookId).then(function(res) {
                $scope.schema = schema;
                $scope.action = action;
                $scope.title = "Modify hook " + hookId;
                init(res);
            }, function(err) {
                return $location.path(backPath);
            });
        } else {
            return $location.path(backPath);
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
            $location.path("/hooks");
        });
    };

    $scope.cancel = function() {
        SisUtil.goBack("/hooks");
    };

    parseRoute();

});



