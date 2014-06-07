angular.module('sisui')
.controller("EntityListController", function($scope, $location, $route,
                                             SisSession, SisDialogs, SisUtil,
                                             SisApi) {
    "use strict";
    if (!($route.current && $route.current.params && $route.current.params.schema)) {
        $location.path("/#schemas");
        return;
    }

    var pager = null;

    $scope.remove = function(entity) {
        if (!pager) { return; }
        pager.remove(entity).then(function(removed) {
            SisSession.setCurrentEntity($scope.schema, null);
        });
    };

    var schemaName = $route.current.params.schema;

    $scope.addNew = function(entity) {
        SisSession.setCurrentEntity($scope.schema, null);
        SisSession.setObjectToCopy(schemaName, entity);
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

    $scope.viewCommits = function(entity) {
        var path = "/commits/entities/" + schemaName + "/" + entity._id;
        $location.path(path);
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
        var opts = { sortField : $scope.idField,
                     itemsField : 'entities',
                     idField : '_id' };
        pager = new SisUtil.EndpointPager(SisApi.entities(schemaName),
                                          $scope, opts);
        pager.setPage(1);

    }, function(err) {
        $location.path("/#schemas");
    });
});