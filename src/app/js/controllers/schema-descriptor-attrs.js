angular.module('sisui')
.controller("SchemaAttrsDescriptorController", function($scope, SisUtil,
                                                        $modalInstance, $log) {

    $scope.attrChanged = function(desc, f, form) {
        if (f.name == "min" || f.name == "max") {
            // validate both
            var min = desc.min;
            var max = desc.max;
            if (typeof min !== 'number' ||
                typeof max !== 'number') {
                // both are fine
                form.min.$setValidity("minVal", true);
                form.max.$setValidity("maxVal", true);
                return;
            }
            form.max.$setValidity("maxVal", max >= min);
            form.min.$setValidity("minVal", min <= max);
        }
    };
});
