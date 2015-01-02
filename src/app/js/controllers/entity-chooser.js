angular.module('sisui')
.controller("EntityChooserController", function($scope, SisUtil, SisApi,
                                                EndpointPager, $modalInstance) {
    "use strict";

    var schema = $scope.schema;
    // set up pager
    var opts = { sortField : $scope.idField, itemsField : 'entities' };
    var endpoint = SisApi.entities(schema.name);
    var pager = EndpointPager.create(endpoint, $scope, opts);
    pager.setPage(1);

});
