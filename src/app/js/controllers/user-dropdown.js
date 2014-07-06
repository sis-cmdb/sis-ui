angular.module('sisui')
.controller("UserDropdownController", function($scope, SisUser,
                                               $rootScope) {
    var getUserRoles = function() {
        if (!$scope.currentUser) {
            return null;
        }
        if ($scope.currentUser.super_user) {
            return null;
        }
        var roles = $scope.currentUser.roles || { };
        var keys = Object.keys(roles);
        if (!keys.length) {
            return null;
        }
        var result = { admin : [], user : [] };
        keys.forEach(function(k) {
            if (roles[k] == 'admin') {
                result.admin.push(k);
            } else {
                result.user.push(k);
            }
        });
        return result;
    };

    var refresh = function() {
        $scope.loggedIn = SisUser.isLoggedIn();
        $scope.currentUser = SisUser.getCurrentUser();
        $scope.roles = getUserRoles();
    };
    refresh();
    $scope.$on("loggedIn", function() {
        refresh();
    });

    $scope.logout = function() {
        SisUser.logout().then(function() {
            var state = $scope.$state;
            var params = $scope.$stateParams;
            // http://stackoverflow.com/a/21936701/263895
            state.transitionTo(state.current, params, {
                reload: true,
                inherit: false,
                notify: true
            });
        });
    };


    SisUser.verify();
});
