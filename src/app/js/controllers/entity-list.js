angular.module('sisui')
.controller("EntityListController", function($scope,
                                             SisSession, SisDialogs, SisUtil,
                                             SisApi, EndpointPager) {
    "use strict";
    if (!($scope.$stateParams.schema)) {
        $scope.$state.go("app.schemas.list");
        return;
    }
    // set up pager
    var pagerOpts = { itemsField : 'entities',
                      idField : '_id' };
    var pager = EndpointPager.createStPager($scope, pagerOpts);

    $scope.remove = function(entity) {
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

    $scope.loadPage = function(state, controller) {
        pager.loadPage(state, controller);
    };

    $scope.getField = function(entity, field) {
        return SisUtil.getObjectField(entity, field);
    };

    SisApi.getSchema(schemaName, true).then(function(schema) {
        $scope.schema = schema;
        $scope.$broadcast('schema', schema);
        $scope.idField = SisUtil.getIdField(schema);

        var endpoint = SisApi.entities(schemaName);
        var sort = $scope.idField;
        pager.setEndpoint(endpoint, sort);
        // patch scope
        SisDialogs.addRemoveDialog($scope, $scope.schema.name,
                                   $scope.idField);

    }, function(err) {
        $scope.$state.go("app.schemas.list");
    });

});
