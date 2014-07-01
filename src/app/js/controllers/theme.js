angular.module('sisui')
.controller("ThemeController", function($scope, $rootScope) {
    "use strict";
    $rootScope.bootstrap_theme = $scope.defaultTheme;

    $scope.setTheme = function(theme) {
        $rootScope.bootstrap_theme = theme;
    };
});