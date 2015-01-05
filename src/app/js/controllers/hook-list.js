angular.module('sisui')
.controller("HookListController", function($scope, SisSession, SisUser,
                                           SisDialogs, SisUtil, SisApi,
                                           EndpointPager) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,entity_type,_sis"
    };

    var hookSchema = SisUtil.getHookSchema();
    var pager = null;

    $scope.remove = function(hook) {
        if (!pager) { return; }
        pager.remove(hook);
    };

    $scope.cacheHook = function(hook, clone) {
        SisSession.setCurrentHook(hook);
        if (!hook) {
            SisSession.setObjectToCopy(hookSchema.name, clone);
        }
    };

    $scope.canManage = function(hook) {
        return SisUtil.canManageEntity(hook, { _sis : { owner : [] }});
    };

    $scope.canAdd = function() {
        var user = SisUser.getCurrentUser();
        if (!user) {
            return false;
        }
        if (user.super_user) { return true; }
        var roles = user.roles || { };
        return Object.keys(roles).length > 0;
    };

    $scope.canRemove = function(hook) {
        return $scope.canManage(hook) && SisUtil.canDelete(hook);
    };

    // setup pager
    var opts = { sortField : 'name', itemsField : 'hooks' };
    var endpoint = SisApi.hooks;
    pager = EndpointPager.create(endpoint, $scope, opts);

    // patch scope
    SisDialogs.addRemoveDialog($scope, 'hook');
});
