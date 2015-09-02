angular.module('sisui')
.controller("SchemaListController", function($scope, SisSession,
                                             SisDialogs, SisUtil, SisApi) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,_sis"
    };

    $scope.remove = function(schema) {
        var name = schema.name;
        SisApi.schemas.delete(schema).then(function(res) {
            SisSession.setSchemas(null);
            loadSchemas();
        });
    };

    $scope.canAdd = function() {
        var adminRoles = SisUtil.getAdminRoles();
        if (adminRoles === null) {
            return false;
        }
        return adminRoles === true || adminRoles.length;
    };

    $scope.canManage = function(schema) {
        return SisUtil.canManageSchema(schema);
    };

    $scope.canRemove = function(schema) {
        return $scope.canManage(schema) && SisUtil.canDelete(schema);
    };

    $scope.cacheSchema = function(schema) {
        SisSession.setCurrentSchema(schema);
    };

    var loadSchemas = function() {
        SisApi.getAllSchemas().then(function(schemas) {
            SisSession.setSchemas(schemas);
            $scope.schemas = schemas;
        }, function(err) {
            $scope.schemas = [];
        });
    };
    loadSchemas();
    // patch scope
    SisDialogs.addRemoveDialog($scope, 'schema');
});
