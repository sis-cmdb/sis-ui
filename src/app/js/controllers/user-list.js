angular.module('sisui')
.controller("UserListController", function($scope, SisUser,
                                        SisDialogs, SisUtil, SisApi,
                                        EndpointPager) {
    "use strict";

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
        if (!userName || adminRoles === null) {
            return false;
        }
        return (!user.super_user &&
                (adminRoles === true || adminRoles.length)) &&
                userName != user.name;
    };

    $scope.canRemove = function(user) {
        return adminRoles === true;
    };

    $scope.canAdd = function() {
        return adminRoles === true;
    };

    $scope.viewCommits = function(user) {
        $state.go("app.commits.sisobj", { type : "users", id : user.name });
    };

    var opts = { sortField : 'name', itemsField : 'users' };
    var pager = EndpointPager.create(SisApi.users, $scope, opts);
    if ($scope.search) {
        pager.setSearch($scope.search);
    }
    pager.setPage(1);
});
