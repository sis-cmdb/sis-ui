angular.module('sisui')
.controller("HookListController", function($scope, SisSession,
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
        $scope.$state.go("^.edit", { hid : hook.name });
    };

    $scope.addNew = function(hook) {
        SisSession.setObjectToCopy(hookSchema.name, hook);
        SisSession.setCurrentHook(null);
        $scope.$state.go("^.add");
    };

    $scope.view = function(hook) {
        var title = "View hook " + hook.name;
        SisDialogs.showViewObjectDialog(hook, hookSchema,
                                        title);
    };

    $scope.viewCommits = function(hook) {
        $scope.$state.go("app.commits.sisobj", { type : "hooks", id : hook.name });
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

    // patch scope
    SisDialogs.addRemoveDialog($scope, 'hook');
});
