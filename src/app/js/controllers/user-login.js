angular.module('sisui')
.controller("UserLoginController", function($scope, SisUser, SisUtil) {
    "use strict";

    if (SisUser.isLoggedIn()) {
        $scope.$state.go("app.schemas.list");
        return;
    }
    $scope.login = function() {
        $scope.error = false;
        var username = $scope.username;
        var pw = $scope.password;
        SisUser.login(username, pw).then(function() {
            SisUtil.goBack("app.schemas.list");
        }, function(err) {
            $scope.error = true;
        });
    };
});
