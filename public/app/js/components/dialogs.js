angular.module('sisui')
.service('SisDialogs', function($modal, $rootScope) {

    "use strict";

    var OBJECT_TEMPLATE = "public/app/partials/view-entity.html";
    var OBJECT_CONTROLLER = "ViewEntityController";

    var SCHEMA_TEMPLATE = "public/app/partials/mod-schema.html";
    var SCHEMA_CONTROLLER = "ModSchemaController";

    var USER_TEMPLATE = "public/app/partials/mod-user.html";
    var USER_CONTROLLER = "ModUserController";

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

});
