angular.module('sisui')
.controller("FooterController", function($scope, SisInfo) {

    SisInfo.apiInfo.success(function(data) {
        $scope.apiInfo = data;
    });
    SisInfo.uiInfo.success(function(data) {
        $scope.uiInfo = data;
    });

});
