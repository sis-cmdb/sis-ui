angular.module('sisui')
.controller("SidebarController", function($scope, $location, SisUser,
                                          $rootScope) {
    $scope.loggedIn = SisUser.isLoggedIn();
    $scope.$on("loggedIn", function() {
        $scope.loggedIn = SisUser.isLoggedIn();
    });

    $scope.logout = function() {
        SisUser.logout().then(function() {
            $location.path("/");
        });
    };

    $scope.isActive = function(name) {
        var path = $location.path();
        switch(name) {
            case 'schemas':
                return path.indexOf("/schemas") === 0 ||
                       path.indexOf("/entities") === 0;
            default:
                return path.indexOf("/" + name) != -1;
        }
    };

    $scope.$on("$locationChangeSuccess", function(evt) {

    });
});
