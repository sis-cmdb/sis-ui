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
            case 'login':
                return path == "/";
            case 'schemas':
                return path.indexOf("/schemas") === 0 ||
                       path.indexOf("/entities") === 0;
            case 'hooks':
                return path.indexOf("/hooks") != -1;
            case 'hiera':
                return path.indexOf("/hiera") != -1;
            default:
                return false;
        }
    };

    $scope.$on("$locationChangeSuccess", function(evt) {

    });
});
