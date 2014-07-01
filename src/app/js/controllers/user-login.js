angular.module('sisui')
.controller("UserLoginController", function($scope, $location,
                                            $window, SisUser) {
    "use strict";

    if (SisUser.isLoggedIn()) {
        $scope.$state.go("app.schemas.list");
        return;
    }
    $scope.login = function() {
        var username = $scope.username;
        var pw = $scope.password;
        SisUser.login(username, pw).then(function() {
            if ($window.history.length) {
                $window.history.back();
            } else {
                $scope.$state.go("app.schemas.list");
            }
        });
    };
});