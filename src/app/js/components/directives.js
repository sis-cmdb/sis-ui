angular.module('sisui')
.directive('sisEntityInput', function($compile, SisUtil) {
    "use strict";
    // returns a select or input element
    // based on descriptor
    // will setup valueChanged and the model
    var getTemplate = function(descriptor, path) {
        var attrs = [
            'ng-model="fieldValue"',
            'name="' + path.replace(/\./g, '_') + '"'
        ];
        if (descriptor.required) {
            attrs.push("required");
        }
        var elem = "input";
        if (descriptor.enum) {
            // select
            elem = "select";
            attrs.push('ng-options="choice for choice in fieldDescriptor().enum"');
            attrs.push('ng-change="valueChanged(fieldValue)"');
        } else {
            // input
            attrs.push('type="' + SisUtil.getInputType(descriptor.type) + '"');
            attrs.push('class="form-control input-sm"');
            attrs.push('placeholder="' + (descriptor.comment || descriptor.type) + '"');
            if ('min' in descriptor) {
                attrs.push('min="' + descriptor.min + '"');
            }
            if ('max' in descriptor) {
                attrs.push('max="' + descriptor.max + '"');
            }
            // refs are special
            if (descriptor.type == 'ObjectId' && descriptor.ref) {
                attrs.push('disabled="disabled"');
            } else {
                attrs.push('ng-change="valueChanged(fieldValue)"');
            }
        }
        var template = "<" + elem + " " + attrs.join(" ") + " >";
        if (elem == "select") {
            // if (!descriptor.required) {
            //     template += '<option value="">null</option>';
            // }
            template += "</select>";
        }
        return template;

    };
    var linker = function(scope, element, attrs, ctrl) {
        var descriptor = scope.fieldDescriptor();
        var path = scope.path();
        element.html(getTemplate(descriptor, path)).show();
        $compile(element.contents())(scope);
        if (descriptor.match) {
            var regex = SisUtil.toRegex(descriptor.match);
            if (regex) {
                ctrl.$parsers.unshift(function(viewValue) {
                    if (regex.test(viewValue)) {
                      // it is valid
                      ctrl.$setValidity('match', true);
                      return viewValue;
                    } else {
                      // it is invalid, return undefined (no model update)
                      ctrl.$setValidity('match', false);
                      return undefined;
                    }
                });
            }
        }
    };
    return {
        link : linker,
        restrict : 'E',
        require: '^ngModel',
        scope : {
            path : '&',
            fieldDescriptor : '&',
            fieldValue : "=ngModel",
            valueChanged : '='
        }
    };
});
