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
        .when("/entities/:schema", {
            templateUrl : "public/app/partials/entities.html",
            controller : "EntitiesController"
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
