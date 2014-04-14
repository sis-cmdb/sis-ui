angular.module('sisui')
.controller("EntitiesController", function($scope, $location, $route,
                                           SisDialogs, SisUtil, SisApi) {
    "use strict";
    if (!($route.current && $route.current.params && $route.current.params.schema)) {
        $location.path("/#schemas");
        return;
    }


    $scope.canManageSchema = function(schema) {
        if (!schema) {
            return false;
        }
        return SisUtil.canManageSchema(schema);
    };

    $scope.editSchema = function(schema) {
        var dlg = SisDialogs.showSchemaDialog(schema, null, 'edit');
        dlg.result.then(function(schema) {
            $scope.schema = schema;
            $scope.$broadcast('schema', schema);
        });
    };

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

    SisApi.schemas.get(schemaName).then(function(schema) {
        if (schema) {
            $scope.$broadcast('schema', schema);
            // grab the entities (TODO: paginate)
            SisApi.entities(schemaName).list().then(function(entities) {
                if (entities) {
                    $scope.schema = schema;
                    $scope.idField = SisUtil.getIdField(schema);
                    $scope.entities = entities.results.map(function(ent) {
                        return ent;
                    });
                }
            });
        } else {
            $location.path("/#schemas");
        }
    });
});