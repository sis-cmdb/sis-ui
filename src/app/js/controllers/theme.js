angular.module('sisui')
.controller("ThemeController", function($scope, $rootScope) {
    "use strict";

    $scope.setTheme = function(theme) {
        $rootScope.bootstrap_theme = theme;
    };
});
