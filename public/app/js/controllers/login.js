angular.module('sisui')
.controller("LoginController", function($scope, $location, SisUser) {
    "use strict";

    if (SisUser.isLoggedIn()) {
        $location.path("/schemas");
        return;
    }
    $scope.login = function() {
        var username = $scope.username;
        var pw = $scope.password;
        SisUser.login(username, pw).then(function() {
            $location.path("/schemas");
        });
    };
});