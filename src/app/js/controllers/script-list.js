angular.module('sisui')
.controller("ScriptListController", function($scope, SisSession, SisUser,
                                             SisDialogs, SisUtil, SisApi,
                                             EndpointPager) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,script_type,_sis,description"
    };

    var scriptSchema = SisUtil.getScriptSchema();
    var pager = null;

    $scope.remove = function(script) {
        if (!pager) { return; }
        pager.remove(script);
    };

    $scope.cacheScript = function(script, clone) {
        SisSession.setCurrentScript(script);
        if (!script) {
            SisSession.setObjectToCopy(scriptSchema.name, clone);
        }
    };

    $scope.canManage = function(script) {
        return SisUtil.canManageEntity(script, { _sis : { owner : [] }});
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

    $scope.canRemove = function(script) {
        return $scope.canManage(script) && SisUtil.canDelete(script);
    };

    // setup pager
    var opts = { sortField : 'name', itemsField : 'scripts' };
    var endpoint = SisApi.scripts;
    pager = EndpointPager.createStPager($scope, opts);
    pager.setEndpoint(endpoint);
    $scope.loadPage = function(state, controller) {
        pager.loadPage(state, controller);
    };

    // patch scope
    SisDialogs.addRemoveDialog($scope, 'script');
});
