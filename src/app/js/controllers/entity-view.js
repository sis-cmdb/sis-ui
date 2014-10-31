angular.module('sisui')
.controller("EntityViewController", function($scope, $state, $stateParams,
                                             SisUtil, SisApi) {
    var init = function() {
        $scope.descriptors = SisUtil.getDescriptorArray($scope.schema);
        $scope.metaDescriptors = [SisUtil.getSisMetaDescriptor()];

        // for the valueChanged recursion
        $scope.fieldValue = $scope.obj;

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

        var maxFieldLen = getMaxFieldName($scope.descriptors.concat($scope.metaDescriptors));

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
    };

    $scope.canManage = function() {
        return SisUtil.canManageEntity($scope.obj, { owner : [] });
    };

    $scope.editObject = function() {
        $state.go("^.edit", $stateParams);
    };

    $scope.action = 'view';
    if ($scope.obj && $scope.schema) {
        init();
        $scope.goToDetail = function() {
            var id = null;
            var schema = null;
            if ($scope.schema.name.indexOf("sis_") === 0) {
                id = $scope.obj.name;
                schema = $scope.schema.name.substring(4);
                $state.go("app." + schema + ".view", { id : id });
            } else {
                id = $scope.obj._id;
                schema = $scope.schema.name;
                $state.go("app.entities.view", { schema : schema, eid : id });
            }
            $scope.$dismiss(null);
        };
    } else {
        // figure them out from the state
        var state = $scope.$state;
        var params = $scope.$stateParams;
        if (state.is("app.hooks.view")) {
            $scope.schema = SisUtil.getHookSchema();
            SisApi.getHook(params.id, true)
            .then(function(hook) {
                $scope.title = "View hook " + hook.name;
                $scope.obj = hook || { };
                init();
            });
        } else if (state.is("app.entities.view")) {
            var eid = params.eid;
            var schema = params.schema;
            SisApi.getEntityWithSchema(eid, schema, true)
            .then(function(result) {
                var idField = SisUtil.getIdField(result[0]);
                $scope.title = "View entity " + result[1][idField] + " of type " + schema;
                $scope.schema = result[0];
                $scope.obj = result[1] || { };
                init();
            });
        }
    }

});
