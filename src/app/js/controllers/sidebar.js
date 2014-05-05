angular.module('sisui')
.controller("SidebarController", function($scope, $location, SisUser,
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
            $location.path("/login");
        });
    };

    var getActiveEntity = function(path) {
        if (path.indexOf('/entities') === 0) {
            var splits = path.split('/');
            if (splits.length >= 3) {
                return splits[2];
            }
        }
        return null;
    };

    $scope.isActive = function(name) {
        var path = $location.path();
        $scope.activeEntity = getActiveEntity(path);
        switch(name) {
            case 'schemas':
                return path.indexOf("/schemas") === 0 ||
                       path.indexOf("/entities") === 0;
            default:
                return path.indexOf("/" + name) != -1;
        }
    };

    SisUser.verify();

});
