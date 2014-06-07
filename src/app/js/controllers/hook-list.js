angular.module('sisui')
.controller("HookListController", function($scope, $location, SisSession,
                                           SisDialogs, SisUtil, SisApi) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,owner,entity_type,sis_locked"
    };

    var hookSchema = SisUtil.getHookSchema();
    var pager = null;

    $scope.remove = function(hook) {
        if (!pager) { return; }
        pager.remove(hook);
    };

    $scope.edit = function(hook) {
        SisSession.setCurrentHook(hook);
        $location.path("/hooks/edit/" + hook.name);
    };

    $scope.addNew = function(hook) {
        SisSession.setObjectToCopy(hookSchema.name, hook);
        SisSession.setCurrentHook(null);
        $location.path("/hooks/add");
    };

    $scope.view = function(hook) {
        var title = "View hook " + hook.name;
        SisDialogs.showViewObjectDialog(hook, hookSchema,
                                        title);
    };

    $scope.viewCommits = function(hook) {
        var path = "/commits/hooks/" + hook.name;
        $location.path(path);
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
    pager = new SisUtil.EndpointPager(endpoint, $scope, opts);
    pager.setPage(1);
});
