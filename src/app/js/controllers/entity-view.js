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

    // assumes all descriptors have a name
    var getMaxFieldName = function(descriptors) {
        return descriptors.reduce(function(max, desc) {
            if (max < desc.name.length) {
                max = desc.name.length;
            }
            return max;
        }, 0);
    };

    var maxFieldLen = getMaxFieldName($scope.descriptors);

    $scope.maxFieldNameLength = function(descriptor) {
        if (!descriptor) {
            return 0;
        }
        if (descriptor._parent_) {
            if (descriptor._parent_._max_field_len_) {
                return descriptor._parent_._max_field_len_;
            }
            if (descriptor._parent_.type == "Document") {
                descriptor._parent_._max_field_len_ = getMaxFieldName(descriptor._parent_.children);
            } else {
                // array - just return something for 9999 elems
                descriptor._parent_._max_field_len_ = 4;
            }
            return descriptor._parent_._max_field_len_;
        } else {
            // root
            return maxFieldLen;
        }
    };

});