angular.module('sisui')
.controller("UsersController", function($scope, $location, SisUser,
                                        SisDialogs, SisUtil, SisApi) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,super_user,roles"
    };

    $scope.edit = function(user) {
        var title = "Edit user " + user.name;
        var dlg = SisDialogs.showUserDialog(user);
        dlg.result.then(function(user) {
            for (var i = 0; i < $scope.users.length; ++i) {
                if (user.name == $scope.users[i].name) {
                    $scope.users[i] = user;
                    break;
                }
            }
        });
    };

    var userName = SisUser.getCurrentUser();
    if (userName) {
        userName = userName.username;
    }
    var adminRoles = SisUtil.getAdminRoles();

    $scope.canManage = function(user) {
        return (!user.super_user && (adminRoles === true ||
                                     adminRoles.length > 0)) &&
                userName != user.name;
    };

    $scope.canRemove = function(user) {
        return adminRoles === true;
    };

    $scope.canAdd = function() {
        return adminRoles === true;
    };

    SisApi.users.listAll({ sort : "name" }).then(function(users) {
        if (users) {
            $scope.users = users;
        }
    });
});
