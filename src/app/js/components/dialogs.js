angular.module('sisui')
.service('SisDialogs', function($modal, $rootScope) {

    "use strict";

    var OBJECT_TEMPLATE = "app/partials/entity-view-dlg.html";
    var OBJECT_CONTROLLER = "EntityViewController";

    var USER_TEMPLATE = "app/partials/user-mod-dlg.html";
    var USER_CONTROLLER = "UserModDlgController";

    var USER_LIST_CONTROLLER = "UserListController";
    var USER_GROUP_TEMPLATE = "app/partials/user-group-list-dlg.html";

    var CONFIRM_DELETE_TEMPLATE = "app/partials/confirm-delete-dlg.html";
    var FILTER_REFERENCE_TEMPLATE = "app/partials/filter-reference-dlg.html";
    var ERROR_TEMPLATE = "app/partials/error-dlg.html";

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

    this.openConfirmDialog = function(title, body) {
        var modalScope = $rootScope.$new(true);
        modalScope.title = title;
        modalScope.body = body;
        return $modal.open({
            templateUrl : CONFIRM_DELETE_TEMPLATE,
            scope : modalScope
        });
    };

    this.showErrorDialog = function(title, body) {
        title = title || "An error occurred";
        var modalScope = $rootScope.$new(true);
        modalScope.title = title;
        modalScope.body = body;
        return $modal.open({
            templateUrl : ERROR_TEMPLATE,
            scope : modalScope
        });
    };

    this.addRemoveDialog = function(scope, type, idField) {
        var oldRemove = scope.remove;
        if (!oldRemove) {
            return;
        }
        if (!idField) {
            idField = 'name';
        }
        var self = this;
        // may be called w/ more than one arg.
        scope.remove = function(obj) {
            if (!obj) {
                // nothing to do.
                return;
            }
            // may be multiple args to the old Remove
            var args = Array.prototype.slice.call(arguments);
            // insert confirm
            var title = "Confirm delete (" + type + ")";
            var body = "Are you sure you want to delete " + obj[idField];
            self.openConfirmDialog(title, body).result.then(function(ok) {
                // call the old remove
                oldRemove.apply(scope, args);
            });
        };
    };

    this.showFilterHelp = function() {
        return $modal.open({
            templateUrl : FILTER_REFERENCE_TEMPLATE,
            windowClass : "wide-modal-window"
        });
    };

});
