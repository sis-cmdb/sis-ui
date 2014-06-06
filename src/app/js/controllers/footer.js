angular.module('sisui')
.controller("FooterController", function($scope, SisApi) {

    SisApi.apiInfo.success(function(data) {
        $scope.apiInfo = data;
    });
    SisApi.uiInfo.success(function(data) {
        $scope.uiInfo = data;
    });

});
