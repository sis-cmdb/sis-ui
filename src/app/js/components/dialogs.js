angular.module('sisui')
.service('SisDialogs', function($modal, $rootScope) {

    "use strict";

    var OBJECT_TEMPLATE = "app/partials/entity-view.html";
    var OBJECT_CONTROLLER = "EntityViewController";

    var USER_TEMPLATE = "app/partials/user-mod-dlg.html";
    var USER_CONTROLLER = "UserModDlgController";

    var USER_LIST_CONTROLLER = "UserListController";
    var USER_GROUP_TEMPLATE = "app/partials/user-group-list-dlg.html";

    var CONFIRM_DELETE_TEMPLATE = "app/partials/confirm-delete-dlg.html";

    var openModal = function(scope, controller, template) {
        return $modal.open({
            templateUrl : template,
            scope : scope,
            controller : controller,
            windowClass : "wide-modal-window"
        });
    };

    this.showUserDialog = function(user) {
        var modalScope = $rootScope.$new(true);
        modalScope.user = user;
        return openModal(modalScope, USER_CONTROLLER, USER_TEMPLATE);
    };

    // returns the modal instance
    this.showViewObjectDialog = function(obj, schema, title) {
        var modalScope = $rootScope.$new(true);
        modalScope.schema = schema;
        modalScope.obj = obj || { };
        modalScope.action = 'view';
        modalScope.modalTitle = title;
        return openModal(modalScope, OBJECT_CONTROLLER, OBJECT_TEMPLATE);
    };

    var _showUserGroupDialog = function(title, search) {
        var modalScope = $rootScope.$new(true);
        modalScope.title = title;
        modalScope.search = search;
        return openModal(modalScope, USER_LIST_CONTROLLER, USER_GROUP_TEMPLATE);
    };

    this.showUsersInGroup = function(group) {
        var search = {};
        search['roles.' + group] = { $exists : true };
        var title = "Users belonging to " + group;
        return _showUserGroupDialog(title, search);
    };

    this.showSuperUsers = function() {
        var search = { super_user : true };
        var title = "Super Users";
        return _showUserGroupDialog(title, search);
    };

    $rootScope.sisDlg = this;

    this.addRemoveDialog = function(scope, type, idField) {
        var oldRemove = scope.remove;
        if (!oldRemove) {
            return;
        }
        if (!idField) {
            idField = 'name';
        }
        // may be called w/ more than one arg.
        scope.remove = function(obj) {
            if (!obj) {
                // nothing to do.
                return;
            }
            // may be multiple args to the old Remove
            var args = Array.prototype.slice.call(arguments);
            // insert confirm
            var modalScope = $rootScope.$new(true);
            modalScope.type = type;
            modalScope.id = obj[idField];
            $modal.open({
                templateUrl : CONFIRM_DELETE_TEMPLATE,
                scope : modalScope
            }).result.then(function(ok) {
                // call the old remove
                oldRemove.apply(scope, args);
            });
        };
    };

});
