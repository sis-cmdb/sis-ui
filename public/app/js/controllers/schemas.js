angular.module('sisui')
.controller("SchemasController", function($scope, $location,
                                          $modal, SisUtil, SisClient) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,owner,sis_locked"
    };

    $scope.remove = function(schema) {
        var name = schema.name;
        SisClient.schemas.delete(schema, function(err, res) {
            if (!err) {
                $scope.$apply(function() {
                    for (var i = 0; i < $scope.schemas.length; ++i) {
                        if ($scope.schemas[i].name == name) {
                            $scope.schemas.splice(i, 1);
                            break;
                        }
                    }
                });
            }
        });
    };

    $scope.edit = function(schema) {
        var modalScope = $scope.$new(true);
        modalScope.schema = schema;
        modalScope.action = 'edit';
        var modal = $modal.open({
            templateUrl : "public/app/partials/mod-schema.html",
            scope : modalScope,
            controller : "ModSchemaController"
        }).result.then(function(schema) {

        });
    };

    $scope.addNew = function() {
        var modalScope = $scope.$new(true);
        modalScope.schema = { };
        modalScope.action = 'add';
        var modal = $modal.open({
            templateUrl : "public/app/partials/mod-schema.html",
            scope : modalScope,
            controller : "ModSchemaController"
        }).result.then(function(schema) {
            $scope.schemas.push(schema);
        });
    };

    $scope.canAdd = function() {
        return !!(SisUtil.getAdminRoles());
    };

    $scope.canManage = function(schema) {
        return SisUtil.canManageSchema(schema);
    };

    $scope.canRemove = function(schema) {
        return $scope.canManage(schema) && SisUtil.canDelete(schema);
    };

    SisClient.schemas.listAll({ sort : "name" }, function(err, schemas) {
        if (schemas) {
            $scope.$apply(function() {
                $scope.schemas = schemas;
            });
        }
    });
});
