// modify a hook (or add)
angular.module('sisui')
.controller("HookModController", function($scope, $route, $location,
                                          SisSession, SisUtil, SisApi) {
    var init = function(orig) {
        if (!SisUtil.canManageEntity(orig, $scope.schema)) {
            return $location.path("/hooks");
        }
        $scope.entity = angular.copy(orig);
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

        // for the valueChanged recursion
        $scope.fieldValue = $scope.entity;

        $scope.hasChanged = function() {
            return !angular.equals(orig, $scope.entity);
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
            init({ });
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
