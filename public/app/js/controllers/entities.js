angular.module('sisui')
.controller("EntitiesController", function($scope, $location, $route,
                                           SisSession, SisDialogs, SisUtil,
                                           SisApi) {
    "use strict";
    if (!($route.current && $route.current.params && $route.current.params.schema)) {
        $location.path("/#schemas");
        return;
    }

    $scope.remove = function(entity) {
        var schemaName = $scope.schema.name;
        SisApi.entities(schemaName).delete(entity).then(function(res) {
            if (!err) {
                $scope.$apply(function() {
                    for (var i = 0; i < $scope.entities.length; ++i) {
                        if ($scope.entities[i]._id == entity._id) {
                            $scope.entities.splice(i, 1);
                            break;
                        }
                    }
                });
            }
        });
    };

    var schemaName = $route.current.params.schema;

    $scope.addNew = function() {
        $location.path("/entities/" + schemaName + "/add");
    };

    $scope.canAdd = function() {
        return $scope.schema &&
               SisUtil.canAddEntity($scope.schema);
    };

    $scope.editEntity = function(entity) {
        SisSession.setCurrentEntity($scope.schema, entity);
        $location.path("/entities/" + schemaName + "/edit/" + entity._id);
    };

    $scope.viewEntity = function(entity) {
        var title = "Entity information " + schemaName;
        SisDialogs.showViewObjectDialog(entity, $scope.schema,
                                        title);
    };

    $scope.canManage = function(entity) {
        return SisUtil.canManageEntity(entity, $scope.schema);
    };

    $scope.canRemove = function(entity) {
        return $scope.canManage(entity) && SisUtil.canDelete(entity);
    };

    SisApi.getSchema(schemaName, true).then(function(schema) {
        $scope.schema = schema;
        $scope.$broadcast('schema', schema);
        $scope.idField = SisUtil.getIdField(schema);

        // set up pager
        var opts = { sortField : $scope.idField, itemsField : 'entities' };
        var pager = new SisUtil.EndpointPager(SisApi.entities(schemaName),
                                          $scope, opts);
        pager.setPage(1);

    }, function(err) {
        $location.path("/#schemas");
    });
});