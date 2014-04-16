angular.module('sisui')
.controller("EntityChooserController", function($scope, SisUtil, SisApi,
                                                $modalInstance, $log) {
    "use strict";

    var schema = $scope.schema;
    $scope.pageSize = 20;
    $scope.loadPage = function() {
        var query = {
            limit : $scope.pageSize,
            offset: ($scope.currentPage - 1) * $scope.pageSize
        };
        SisApi.entities(schema.name).list(query).then(function(entities) {
            $scope.totalItems = entities.total_count;
            $scope.entities = entities.results;
        });
    };

    $scope.totalItems = 0;

    // paging
    $scope.setPage = function(pageNum) {
        $scope.currentPage = pageNum;
        $scope.loadPage();
    };

    $scope.setPage(1);

});
