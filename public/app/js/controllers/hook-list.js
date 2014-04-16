angular.module('sisui')
.controller("HookListController", function($scope, $location, SisSession,
                                           SisDialogs, SisUtil, SisApi) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,owner,entity_type,sis_locked"
    };

    var hookSchema = SisUtil.getHookSchema();

    $scope.remove = function(hook) {
        var name = hook.name;
        SisApi.hooks.delete(hook).then(function(res) {
            for (var i = 0; i < $scope.hooks.length; ++i) {
                if ($scope.hooks[i].name == name) {
                    $scope.hooks.splice(i, 1);
                    break;
                }
            }
        });
    };

    $scope.edit = function(hook) {
        SisSession.setCurrentHook(hook);
        $location.path("/hooks/edit/" + hook.name);
    };

    $scope.addNew = function() {
        SisSession.setCurrentHook(null);
        $location.path("/hooks/add");
    };

    $scope.view = function(hook) {
        var title = "View hook " + hook.name;
        SisDialogs.showViewObjectDialog(hook, hookSchema,
                                    'view', title);
    };

    $scope.canManage = function(hook) {
        return SisUtil.canManageEntity(hook, { owner : [] });
    };

    $scope.canRemove = function(hook) {
        return $scope.canManage(hook) && SisUtil.canDelete(hook);
    };

    // setup pager
    var opts = { sortField : 'name', itemsField : 'hooks' };
    var endpoint = SisApi.hooks;
    var pager = new SisUtil.EndpointPager(endpoint, $scope, opts);
    pager.setPage(1);
});
