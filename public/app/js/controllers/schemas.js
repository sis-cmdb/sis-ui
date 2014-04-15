angular.module('sisui')
.controller("SchemasController", function($scope, $location, SisSession,
                                          SisDialogs, SisUtil, SisApi) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,owner,sis_locked"
    };

    $scope.remove = function(schema) {
        var name = schema.name;
        SisApi.schemas.delete(schema).then(function(res) {
            SisSession.setSchemas(null);
            loadSchemas();
        });
    };

    $scope.edit = function(schema) {
        var dlg = SisDialogs.showSchemaDialog(schema, $scope.schemas, 'edit');
        dlg.result.then(function(schema) {
            SisSession.setSchemas(null);
            loadSchemas();
        });
    };

    $scope.addNew = function() {
        var dlg = SisDialogs.showSchemaDialog(null, $scope.schemas, 'add');
        dlg.result.then(function(schema) {
            SisSession.setSchemas(null);
            loadSchemas();
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

    $scope.gotoSchema = function(schema) {
        SisSession.setCurrentSchema(schema);
        $location.path("/entities/" + schema.name);
    };

    var loadSchemas = function() {
        var schemas = SisSession.getSchemas();
        if (!schemas) {
            SisApi.schemas.listAll({ sort : "name" }).then(function(schemas) {
                SisSession.setSchemas(schemas);
                $scope.schemas = schemas || [];
            });
        } else {
            $scope.schemas = schemas;
        }
    };
    loadSchemas();
});
