angular.module('sisui')
.controller("SchemasController", function($scope, $location,
                                          SisDialogs, SisUtil, SisApi) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,owner,sis_locked"
    };

    $scope.remove = function(schema) {
        var name = schema.name;
        SisApi.schemas.delete(schema).then(function(res) {
            for (var i = 0; i < $scope.schemas.length; ++i) {
                if ($scope.schemas[i].name == name) {
                    $scope.schemas.splice(i, 1);
                    break;
                }
            }
        });
    };

    $scope.edit = function(schema) {
        var dlg = SisDialogs.showSchemaDialog(schema, $scope.schemaList, 'edit');
        dlg.result.then(function(schema) {
            for (var i = 0; i < $scope.schemas.length; ++i) {
                if (schema.name == $scope.schemas[i].name) {
                    $scope.schemas[i] = schema;
                    break;
                }
            }
        });
    };

    $scope.addNew = function() {
        var dlg = SisDialogs.showSchemaDialog(null, $scope.schemaList, 'add');
        dlg.result.then(function(schema) {
            $scope.schemas.push(schema);
            $scope.schemas.sort(function(s1, s2) {
                if (s1.name < s2.name) {
                    return -1;
                } else if (s1.name > s2.name) {
                    return 1;
                } else {
                    return 0;
                }
            });
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

    SisApi.schemas.listAll({ sort : "name" }).then(function(schemas) {
        if (schemas) {
            $scope.schemas = schemas;
        }
    });
});
