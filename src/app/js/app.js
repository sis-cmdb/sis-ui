angular.module('sisui', ['ui.router', 'ui.bootstrap', 'sisconfig'])
.config(function($stateProvider, $urlRouterProvider) {
    "use strict";

    $urlRouterProvider
        .when("/docs", "/docs/index")
        .otherwise("/schemas");

    $stateProvider
        // root state
        .state("app", {
            url : "",
            templateUrl : "app/partials/app-root-state.html",
            abstract : true
        })
        // user stuff
        .state("app.login", {
            url : "/login",
            templateUrl : "app/partials/user-login.html",
            controller : 'UserLoginController'
        })
        .state("app.users", {
            url : "/users",
            templateUrl : "app/partials/user-list.html",
            controller : "UserListController"
        })

        // schemas
        .state("app.schemas", {
            url : "/schemas",
            template : "<ui-view></ui-view>",
            abstract : true
        })
        .state("app.schemas.list", {
            url : "",
            templateUrl : "app/partials/schema-list.html",
            controller : "SchemaListController"
        })
        // TODO - turn this into optional params
        .state("app.schemas.add", {
            url : "/add",
            templateUrl : "app/partials/schema-mod.html",
            controller : "SchemaModController"
        })
        .state("app.schemas.edit", {
            url : "/edit/:schema",
            templateUrl : "app/partials/schema-mod.html",
            controller : "SchemaModController"
        })

        // entities
        .state("app.entities", {
            url : "/entities/:schema",
            template : "<ui-view></ui-view>",
            abstract : true
        })
        .state("app.entities.list", {
            url : "",
            templateUrl : "app/partials/entity-list.html",
            controller : "EntityListController"
        })
        // TODO - turn this into optional params
        .state("app.entities.add", {
            url : "/add",
            templateUrl : "app/partials/entity-mod.html",
            controller : "EntityModController"
        })
        .state("app.entities.edit", {
            url : "/edit/:eid",
            templateUrl : "app/partials/entity-mod.html",
            controller : "EntityModController"
        })
        .state("app.entities.view", {
            url : "/view/:eid",
            templateUrl : "app/partials/entity-view.html",
            controller : "EntityViewController"
        })

        // hooks
        .state("app.hooks", {
            url : "/hooks",
            template : "<ui-view></ui-view>",
            abstract : true
        })
        .state("app.hooks.list", {
            url : "",
            templateUrl : "app/partials/hook-list.html",
            controller : "HookListController"
        })
        // TODO - turn this into optional params
        .state("app.hooks.add", {
            url : "/add",
            templateUrl : "app/partials/entity-mod.html",
            controller : "HookModController"
        })
        .state("app.hooks.edit", {
            url : "/edit/:hid",
            templateUrl : "app/partials/entity-mod.html",
            controller : "HookModController"
        })
        .state("app.hooks.view", {
            url : "/view/:id",
            templateUrl : "app/partials/entity-view.html",
            controller : "HookViewController"
        })

        // tokens
        .state("app.tokens", {
            url : "/tokens",
            templateUrl : "app/partials/token-list.html",
            controller : "TokenListController"
        })
        // commits
        .state("app.commits", {
            url : "/commits",
            template : "<ui-view></ui-view>",
            abstract : true
        })
        // TODO - turn this into optional params
        .state("app.commits.entities", {
            url : "/entities/:schema/:id",
            templateUrl : "app/partials/commit-list.html",
            controller : "CommitListController"
        })
        .state("app.commits.sisobj", {
            url : "/:type/:id",
            templateUrl : "app/partials/commit-list.html",
            controller : "CommitListController"
        })

        // docs
        .state("docs", {
            url : "/docs/:doc",
            templateUrl : function(params) {
                var doc = params.doc;
                return "app/docs/" + doc;
            }
        })
        ;
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
})
.run(function ($rootScope,   $state,   $stateParams) {
    $rootScope.$state = $state;
    $rootScope.$stateParams = $stateParams;
});
