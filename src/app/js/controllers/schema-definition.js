angular.module('sisui')
.controller("SchemaDefinitionController", function($scope, SisUtil, SisApi) {
    "use strict";

    $scope.$on('schema', function(event, schema) {
        $scope.schema = schema;
        $scope.descriptors = SisUtil.getDescriptorArray(schema);
        var expression = $scope.schema.owner.reduce(function(q, owner) {
            q['roles.' + owner] = 'admin';
            return q;
        }, { });
        var query = {
            q : {
                $or : [
                    { super_user : true },
                    expression
                ]
            }
        };
        SisApi.users.listAll(query).then(function(users) {
            $scope.admins = users;
        });
    });
});
