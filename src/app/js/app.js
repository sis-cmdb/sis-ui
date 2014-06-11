angular.module('sisui', ['ngRoute', 'ui.bootstrap', 'sisconfig'])
.config(function($routeProvider) {
    "use strict";

    $routeProvider
        // user stuff
        .when("/login", {
            templateUrl : "app/partials/user-login.html",
            controller : 'UserLoginController'
        })
        .when("/users", {
            templateUrl : "app/partials/user-list.html",
            controller : "UserListController"
        })
        // schemas
        .when("/schemas", {
            templateUrl : "app/partials/schema-list.html",
            controller : "SchemaListController"
        })
        .when("/schemas/:action/:schema?", {
            templateUrl : "app/partials/schema-mod.html",
            controller : "SchemaModController"
        })
        // entities
        .when("/entities/:schema", {
            templateUrl : "app/partials/entity-list.html",
            controller : "EntityListController"
        })
        .when("/entities/:schema/:action/:eid?", {
            templateUrl : "app/partials/entity-mod.html",
            controller : "EntityModController"
        })
        // hooks
        .when("/hooks", {
            templateUrl : "app/partials/hook-list.html",
            controller : "HookListController"
        })
        .when("/hooks/:action/:hid?", {
            templateUrl : "app/partials/entity-mod.html",
            controller : "HookModController"
        })
        // tokens
        .when("/tokens", {
            templateUrl : "app/partials/token-list.html",
            controller : "TokenListController"
        })
        // commits
        .when("/commits/:type/:idOrType/:eid?", {
            templateUrl : "app/partials/commit-list.html",
            controller : "CommitListController"
        })
        // fall back
        .otherwise({
            redirectTo: '/schemas'
        });
})
// From http://stackoverflow.com/a/17472118/263895
.directive('ngEnter', function () {
    return function (scope, element, attrs) {
        element.bind("keydown keypress", function (event) {
            if(event.which === 13) {
                scope.$apply(function (){
                    scope.$eval(attrs.ngEnter);
                });

                event.preventDefault();
            }
        });
    };
});