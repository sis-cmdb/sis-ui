(function() {

    "use strict";

    var sisapp = angular.module('sisui', ['ngRoute', 'ui.bootstrap', 'sisconfig'])
    .config(function($routeProvider) {
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
            .when("/entities/:schema/:eid", {
                templateUrl : "public/app/partials/entities.html",
                controller : "EntitiesController"
            })
            .otherwise({
                redirectTo: '/schemas'
            });
    });

})();
