angular.module('sisui')
.controller("TokenListController", function($scope, SisUser,
                                            SisDialogs, SisUtil, SisApi) {
    "use strict";
    $scope.temps = [];
    $scope.persistent = [];
    $scope.newToken = { };

    var user = SisUser.getCurrentUser();
    if (!user) {
        $scope.$state.go("app.users");
        return;
    }

    var endpoint = SisApi.tokens(user.username);

    $scope.remove = function(token, isTemp) {
        endpoint.delete(token).then(function(removed) {
            var items = isTemp ? $scope.temps : $scope.persistent;
            for (var i = 0; i < items.length; ++i) {
                if (items[i].name == token.name) {
                    items.splice(i, 1);
                    break;
                }
            }
        });
    };

    $scope.isCurrent = function(token) {
        return token.name === user.token;
    };

    $scope.canAdd = function() {
        return !user.super_user && (user.roles && Object.keys(user.roles).length);
    };

    $scope.addNew = function() {
        if (!$scope.newToken.desc) { return; }
        endpoint.create($scope.newToken).then(function(created) {
            $scope.newToken = { };
            $scope.persistent.push(created);
        });
    };

    // fetch and break up
    endpoint.listAll().then(function(tokens) {
        tokens.forEach(function(token) {
            if (typeof token.expires !== 'undefined') {
                $scope.temps.push(token);
            } else {
                $scope.persistent.push(token);
            }
        });
    });

    // patch scope
    SisDialogs.addRemoveDialog($scope, 'token');

});
