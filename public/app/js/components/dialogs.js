angular.module('sisui')
.service('SisDialogs', function($modal, $rootScope) {

    "use strict";

    var OBJECT_TEMPLATE = "public/app/partials/mod-entity.html";
    var OBJECT_CONTROLLER = "ModEntityController";

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

    var createEmptySchema = function() {
        return {
            name : "",
            owner : [],
            definition : {
                name : "String"
            },
            sis_locked : false,
            locked_fields : []
        };
    };

    this.showUserDialog = function(user) {
        var modalScope = $rootScope.$new(true);
        modalScope.user = user;
        return openModal(modalScope, USER_CONTROLLER, USER_TEMPLATE);
    };

    // returns the modal instance
    this.showObjectDialog = function(obj, schema, action, title) {
        var modalScope = $rootScope.$new(true);
        modalScope.schema = schema;
        modalScope.obj = obj || { };
        modalScope.action = action;
        modalScope.modalTitle = title;
        return openModal(modalScope, OBJECT_CONTROLLER, OBJECT_TEMPLATE);
    };

    this.showSchemaDialog = function(schema, schemaList, action) {
        var modalScope = $rootScope.$new(true);
        modalScope.schema = schema || createEmptySchema();
        modalScope.action = action;
        modalScope.schemaList = schemaList;
        return openModal(modalScope, SCHEMA_CONTROLLER, SCHEMA_TEMPLATE);
    };

});
