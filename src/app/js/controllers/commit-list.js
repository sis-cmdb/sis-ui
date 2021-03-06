angular.module('sisui')
.controller("CommitListController", function($scope, SisApi,
                                             SisUtil, EndpointPager, $sce) {
    "use strict";
    var type = $scope.$stateParams.type || "entities";
    var id = $scope.$stateParams.id;
    var schemaName = $scope.$stateParams.schema;
    var supportedTypes = [
        'schemas',
        'hooks',
        'hiera',
        'entities'
    ];
    if (supportedTypes.indexOf(type) == -1 ||
        (type == 'entities' && !id)) {
            $scope.$state.go("app.schemas.list");
            return;
    }

    // setup a pager
    var opts = { sortField : 'date_modified',
                 itemsField : 'commits',
                 idField : '_id',
                 ignoreLoc : true };
    var pager = EndpointPager.createStPager($scope, opts);

    var setup = function(endpoint, itemType, itemId) {
        // set page title
        $scope.title = "Commits for " + itemType + " " + itemId;

        $scope.getDiff = function(commit) {
            var html = null;
            if (commit.action == 'insert' || commit.action == 'delete') {
                html = '<pre>' + angular.toJson(commit.commit_data, true) + '</pre>';
            } else {
                if (!commit.commit_data) {
                    if (commit.diff) {
                        commit.commit_data = commit.diff;
                    } else {
                        commit.commit_data = { };
                    }
                }
                Object.keys(commit.commit_data).forEach(function(k) {
                    if (k[0] == '_') { delete commit.commit_data[k]; }
                });
                html = jsondiffpatch.formatters.html.format(commit.commit_data);
            }
            return $sce.trustAsHtml(html);
        };

        pager.setEndpoint(endpoint);
    };

    $scope.loadPage = function(state, controller) {
        pager.loadPage(state, controller);
    };

    if (type != 'entities') {
        var endpoint = SisApi[type].commits(id);
        setup(endpoint, type, id);
    } else {
        SisApi.getSchema(schemaName, false).then(function(schema) {
            var endpoint = SisApi.entities(schemaName).commits(id);
            setup(endpoint, schemaName, id);
        }, function(err) {
            $scope.$state.go("app.schemas.list");
            return;
        });
    }

});
