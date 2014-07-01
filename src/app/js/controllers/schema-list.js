angular.module('sisui')
.controller("SchemaListController", function($scope, SisSession,
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
        $scope.$state.go("^.edit", { schema : schema.name });
    };

    $scope.addNew = function() {
        $scope.$state.go("^.add");
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
        $scope.$state.go("app.commits.sisobj", { type : "schemas", id : schema.name });
    };

    $scope.gotoSchema = function(schema) {
        SisSession.setCurrentSchema(schema);
        $scope.$state.go("app.entities.list", { schema : schema.name });
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
