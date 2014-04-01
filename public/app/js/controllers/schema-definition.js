angular.module('sisui')
.controller("SchemaDefinitionController", function($scope, SisClient, SisUtil) {
    "use strict";

    $scope.$on('schema', function(event, schema) {
        $scope.schema = schema;
        $scope.descriptors = SisUtil.getDescriptorArray(schema);
    });
});
