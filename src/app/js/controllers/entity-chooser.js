angular.module('sisui')
.controller("EntityChooserController", function($scope, SisUtil, SisApi,
                                                EndpointPager, $modalInstance) {
    "use strict";

    var schema = $scope.schema;
    // set up pager
    var opts = { sortField : $scope.idField, itemsField : 'entities',
                 ignoreLoc : true };
    var endpoint = SisApi.entities(schema.name);
    var pager = EndpointPager.createStPager($scope, opts);
    pager.setEndpoint(endpoint);
    $scope.loadPage = function(state, controller) {
        pager.loadPage(state, controller);
    };
});
