angular.module('sisui')
.controller("EntityViewController", function($scope,
                                             SisUtil, SisApi) {
    var orig = $scope.obj;
    $scope.obj = angular.copy(orig);
    $scope.descriptors = SisUtil.getDescriptorArray($scope.schema);
    // need to tweak this so owner and sis_locked show up..
    var foundLocked = false;
    for (var i = 0; i < $scope.descriptors.length; ++i) {
        var desc = $scope.descriptors[i];
        if (desc.name == 'owner') {
            // convert owner into an enum
            desc.enum = SisUtil.getOwnerSubset($scope.schema);
        } else if (desc.name == 'sis_locked') {
            foundLocked = true;
        }
    }
    if (!foundLocked) {
        $scope.descriptors.push({
            name : "sis_locked",
            type : "Boolean"
        });
    }

    // for the valueChanged recursion
    $scope.fieldValue = $scope.obj;

});