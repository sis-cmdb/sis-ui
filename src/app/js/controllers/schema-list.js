angular.module('sisui')
.controller("SchemaListController", function($scope, $location, SisSession,
                                          SisDialogs, SisUtil, SisApi) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,owner,sis_locked"
    };

    $scope.remove = function(schema) {
        var name = schema.name;
        // TODO: show confirm
        SisApi.schemas.delete(schema).then(function(res) {
            SisSession.setSchemas(null);
            loadSchemas();
        });
    };

    $scope.edit = function(schema) {
        SisSession.setCurrentSchema(schema);
        $location.path("/schemas/edit/" + schema.name);
    };

    $scope.addNew = function() {
        $location.path("/schemas/add");
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

    $scope.viewCommits = function(schema) {
        var path = "/commits/schemas/" + schema.name;
        $location.path(path);
    };

    $scope.gotoSchema = function(schema) {
        SisSession.setCurrentSchema(schema);
        $location.path("/entities/" + schema.name);
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
