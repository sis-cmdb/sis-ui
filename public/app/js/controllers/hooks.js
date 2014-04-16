angular.module('sisui')
.controller("HooksController", function($scope, $location,
                                        SisDialogs, SisUtil, SisApi) {
    "use strict";

    var query = {
        sort : "name",
        fields : "name,owner,entity_type,sis_locked"
    };

    var hookSchema = {
        name : "sis_hooks",
        owner : SisUtil.getAllRoles(),
        definition : {
            name : { type : "String", required : true, unique : true },
            target : {
                    type : {
                        url : { type : "String", required : true },
                        action : { type : "String", required : true, enum : ["GET", "POST", "PUT"]}
                    },
                    required : true
            },
            retry_count : { type : "Number", min : 0, max : 20, "default" : 0 },
            retry_delay : { type : "Number", min : 1, max : 60, "default" : 1 },
            events : { type : [{ type : "String", enum : ["insert", "update", "delete"] }], required : true },
            owner : { type : ["String"] },
            entity_type : "String"
        }
    };

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
        var title = "Edit hook " + hook.name;
        var dlg = SisDialogs.showObjectDialog(hook, hookSchema,
                                              'edit', title);
        dlg.result.then(function(hook) {
            for (var i = 0; i < $scope.hooks.length; ++i) {
                if (hook.name == $scope.hooks[i].name) {
                    $scope.hooks[i] = hook;
                    break;
                }
            }
        });
    };

    $scope.addNew = function() {
        var title = "Add a new hook";
        var dlg = SisDialogs.showObjectDialog(null, hookSchema,
                                              'add', title);
        dlg.result.then(function(hook) {
            $scope.hooks.push(hook);
            $scope.hooks.sort(function(s1, s2) {
                if (s1.name < s2.name) {
                    return -1;
                } else if (s1.name > s2.name) {
                    return 1;
                } else {
                    return 0;
                }
            });
        });
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
