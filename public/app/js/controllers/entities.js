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
        var title = "Add a new entity of type " + schemaName;
        var dlg = SisDialogs.showObjectDialog(null, $scope.schema,
                                              'add', title);
        dlg.result.then(function(entity) {
            $scope.entities.push(entity);
        });
    };

    $scope.canAdd = function() {
        return $scope.schema &&
               SisUtil.canAddEntity($scope.schema);
    };

    $scope.editEntity = function(entity) {
        var title = "Modify entity of type " + schemaName;
        var dlg = SisDialogs.showObjectDialog(entity, $scope.schema,
                                              'edit', title);
        dlg.result.then(function(entity) {
            for (var i = 0; i < $scope.entities.length; ++i) {
                if ($scope.entities[i]._id == entity._id) {
                    $scope.entities[i] = entity;
                    break;
                }
            }
        });
    };

    $scope.viewEntity = function(entity) {
        var title = "Entity information " + schemaName;
        SisDialogs.showObjectDialog(entity, $scope.schema,
                                    'view', title);
    };

    $scope.canManage = function(entity) {
        return SisUtil.canManageEntity(entity, $scope.schema);
    };

    $scope.canRemove = function(entity) {
        return $scope.canManage(entity) && SisUtil.canDelete(entity);
    };

    $scope.pageSize = 20;
    $scope.loadPage = function() {
        var query = {
            limit : $scope.pageSize,
            offset: ($scope.currentPage - 1) * $scope.pageSize
        };
        SisApi.entities(schemaName).list(query).then(function(entities) {
            if (entities) {
                $scope.totalItems = entities.total_count;
                $scope.entities = entities.results.map(function(ent) {
                    return ent;
                });
            }
        });
    };

    $scope.totalItems = 0;
    var schema = SisSession.getCurrentSchema();
    if (!schema || schema.name != schemaName) {
        SisApi.schemas.get(schemaName).then(function(schema) {
            if (schema) {
                $scope.schema = schema;
                $scope.$broadcast('schema', schema);
                $scope.idField = SisUtil.getIdField(schema);
            } else {
                $location.path("/#schemas");
            }
        });
    } else {
        $scope.schema = schema;
        $scope.$broadcast('schema', schema);
        $scope.idField = SisUtil.getIdField(schema);
    }

    // paging
    $scope.setPage = function(pageNum) {
        $scope.currentPage = pageNum;
        $scope.loadPage();
    };

    $scope.setPage(1);
});