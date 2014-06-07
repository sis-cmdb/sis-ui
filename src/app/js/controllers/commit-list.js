angular.module('sisui')
.controller("CommitListController", function($scope, $routeParams, $location,
                                             SisApi, SisUtil, $sce) {
    "use strict";
    var type = $routeParams.type;
    var idOrType = $routeParams.idOrType;
    var eid = $routeParams.eid;
    var supportedTypes = [
        'schemas',
        'hooks',
        'hiera',
        'entities'
    ];
    if (supportedTypes.indexOf(type) == -1 ||
        (type == 'entities' && !eid)) {
            $location.path("/#schemas");
            return;
    }

    var setup = function(endpoint, itemType, itemId) {
        // set page title
        $scope.title = "Commits for " + itemType + " " + itemId;

        $scope.getDiff = function(commit) {
            var html = null;
            if (commit.action == 'insert' || commit.action == 'delete') {
                html = '<pre>' + angular.toJson(commit.commit_data, true) + '</pre>';
            } else {
                Object.keys(commit.commit_data).forEach(function(k) {
                    if (k[0] == '_') { delete commit.commit_data[k]; }
                });
                html = jsondiffpatch.formatters.html.format(commit.commit_data);
            }
            return $sce.trustAsHtml(html);
        };

        // setup a pager
        var opts = { sortField : 'date_modified',
                     itemsField : 'commits',
                     idField : '_id' };
        var pager = new SisUtil.EndpointPager(endpoint, $scope, opts);
        pager.setPage(1);
    };

    if (type != 'entities') {
        var endpoint = SisApi[type].commits(idOrType);
        setup(endpoint, type, idOrType);
    } else {
        SisApi.getSchema(idOrType, false).then(function(schema) {
            var endpoint = SisApi.entities(idOrType).commits(eid);
            setup(endpoint, idOrType, eid);
        }, function(err) {
            $location.path("/#schemas");
            return;
        });
    }

});
