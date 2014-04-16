angular.module('sisui', ['ngRoute', 'ui.bootstrap', 'sisconfig'])
.config(function($routeProvider) {
    "use strict";

    $routeProvider
        .when("/login", {
            templateUrl : "public/app/partials/login.html",
            controller : 'LoginController'
        })
        .when("/schemas", {
            templateUrl : "public/app/partials/schemas.html",
            controller : "SchemasController"
        })
        .when("/schemas/:action", {
            templateUrl : "public/app/partials/mod-schema.html",
            controller : "ModSchemaController"
        })
        .when("/schemas/:action/:schema", {
            templateUrl : "public/app/partials/mod-schema.html",
            controller : "ModSchemaController"
        })
        .when("/entities/:schema", {
            templateUrl : "public/app/partials/entities.html",
            controller : "EntitiesController"
        })
        .when("/entities/:schema/:action/:eid?", {
            templateUrl : "public/app/partials/mod-entity.html",
            controller : "ModEntityController"
        })
        .when("/hooks", {
            templateUrl : "public/app/partials/hooks.html",
            controller : "HooksController"
        })
        .when("/users", {
            templateUrl : "public/app/partials/users.html",
            controller : "UsersController"
        })
        .otherwise({
            redirectTo: '/schemas'
        });
});
