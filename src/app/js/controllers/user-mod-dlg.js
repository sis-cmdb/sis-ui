
// controller for editing a user
angular.module('sisui')
.controller("UserModDlgController", function($scope, $modalInstance,
                                             SisUtil, SisApi, SisDialogs) {
    "use strict";

    var adminGroups = SisUtil.getAdminRoles();

    if (adminGroups !== true) {
        $scope.currGroups = adminGroups || [];
    }

    $scope.user = angular.copy($scope.user);
    $scope.user.roles = $scope.user.roles || { };
    $scope.role = { };

    var orig = angular.copy($scope.user);

    $scope.isSuperUser = function() {
        return adminGroups === true;
    };

    $scope.addRole = function() {
        if ($scope.role.role && $scope.role.group) {
            $scope.user.roles[$scope.role.group] = $scope.role.role;
            $scope.role = { };
        }
    };

    $scope.canManageRole = function(role) {
        return adminGroups === true ||
               adminGroups.indexOf(role) >= 0;
    };

    $scope.deleteGroup = function(group) {
        delete $scope.user.roles[group];
    };

    $scope.hasChanged = function() {
        return !angular.equals(orig, $scope.user);
    };

    $scope.save = function() {
        var user = $scope.user;
        if (user.super_user) {
            user.roles = { };
        }
        SisApi.users.update(user).then(function(res) {
            $modalInstance.close(res);
        }).catch(function(err) {
            SisDialogs.showErrorDialog(null, err.error);
        });
    };

});
