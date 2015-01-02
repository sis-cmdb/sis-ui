angular.module('sisui')
.controller("EntityListController", function($scope,
                                             SisSession, SisDialogs, SisUtil,
                                             SisApi) {
    "use strict";
    if (!($scope.$stateParams.schema)) {
        $scope.$state.go("app.schemas.list");
        return;
    }

    var pager = null;

    $scope.remove = function(entity) {
        if (!pager) { return; }
        pager.remove(entity).then(function(removed) {
            SisSession.setCurrentEntity($scope.schema, null);
        });
    };

    var schemaName = $scope.$stateParams.schema;

    $scope.canAdd = function() {
        return $scope.schema &&
               SisUtil.canAddEntity($scope.schema);
    };

    $scope.cacheEntity = function(entity, clone) {
        SisSession.setCurrentEntity($scope.schema, entity);
        if (!entity) {
            SisSession.setObjectToCopy(schemaName, clone);
        }
    };

    $scope.canManage = function(entity) {
        return SisUtil.canManageEntity(entity, $scope.schema);
    };

    $scope.canRemove = function(entity) {
        return $scope.canManage(entity) && SisUtil.canDelete(entity);
    };

    $scope.canManageSchema = function() {
        if (!$scope.schema) {
            return false;
        }
        return SisUtil.canManageSchema($scope.schema);
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

        // patch scope
        SisDialogs.addRemoveDialog($scope, $scope.schema.name,
                                   $scope.idField);

    }, function(err) {
        $scope.$state.go("app.schemas.list");
    });

});
