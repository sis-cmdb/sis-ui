angular.module('sisui')
.controller("SidebarController", function($scope,
                                          $rootScope) {

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

});
