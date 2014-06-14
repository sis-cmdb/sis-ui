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
            template += "</select>";
        }
        return template;

    };
    var linker = function(scope, element, attrs, ctrl) {
        var descriptor = scope.fieldDescriptor();
        var path = scope.path;
        element.html(getTemplate(descriptor, path)).show();
        $compile(element.contents())(scope);
        if (!ctrl || !ctrl[path]) {
            return;
        }
        ctrl = ctrl[path];
        if (descriptor.match) {
            var regex = SisUtil.toRegex(descriptor.match);
            if (regex) {
                ctrl.$parsers.unshift(function(viewValue) {
                    if (!viewValue) {
                        ctrl.$setValidity('match', true);
                        return viewValue;
                    }
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
        require: '^form',
        scope : {
            path : '@',
            fieldDescriptor : '&',
            fieldValue : "=ngModel",
            valueChanged : '='
        }
    };
})
.directive("sisSchemaAttr", function($compile, SisUtil) {
    "use strict";
    var knownTypes = {
        'number' : true,
        'text' : true,
        'checkbox' : true
    };
    var getTemplate = function(type, name) {
        var attrs = [
            "ng-model='descriptor[field.name]'",
            "ng-change='changed(descriptor, field, formCtrl)'",
            'name="' + name + '"'
        ];
        var elem = "input";
        if (type == 'select') {
            elem = "select";
            attrs.push('ng-options="s.name for s in choices()"');
        } else {
            var inputType = type;
            if (!(inputType in knownTypes)) {
                inputType = 'text';
            }
            attrs.push('type="' + inputType + '"');
            //var classes = ['form-control'];
            var classes = [];
            if (inputType != 'checkbox') {
                classes.push("input-sm");
            }
            attrs.push('class="' + classes.join(" ") + '"');
        }
        var template = "<" + elem + " " + attrs.join(" ") + " >";
        if (elem == "select") {
            template += "</select>";
        }
        return template;
    };
    var linker = function(scope, element, attrs, formCtrl) {
        var field = scope.field;
        var descriptor = scope.descriptor;
        var type = field.type;
        var name = field.name;
        scope.formCtrl = formCtrl;
        element.html(getTemplate(type, name)).show();
        $compile(element.contents())(scope);
        if (!formCtrl || !formCtrl[name]) {
            return;
        }
        var ctrl = formCtrl[name];
        if (type == 'regex') {
            ctrl.$parsers.unshift(function(viewValue) {
                if (!viewValue) {
                    ctrl.$setValidity("regex", true);
                    return viewValue;
                }
                var regex = SisUtil.toRegex(viewValue);
                if (regex) {
                    // it is valid
                    ctrl.$setValidity('regex', true);
                    return viewValue;
                } else {
                    // it is invalid, return undefined (no model update)
                    ctrl.$setValidity('regex', false);
                    return undefined;
                }
            });
        }
    };
    return {
        link : linker,
        restrict : 'E',
        transclude : true,
        require: "^form",
        scope : {
            name : '&',
            field : "=",
            changed : "=",
            choices : "&",
            descriptor : "="
        }
    };
})
.directive("sisSchemaFieldName", function(SisUtil, $compile) {
    var getTemplate = function(readOnly, name) {
        if (!readOnly) {
            return '<input name="' + name + '" ' +
                'style="width: {{ maxFieldNameLength(descriptor) | labelWidth }}; "' +
                'margin-right: 4px;" ng-model="descriptor.name" ' +
                'ng-change="change(descriptor)" required>';
        } else {
            return '<label class="schema-label" ' +
                'style="width: {{ maxFieldNameLength(descriptor) | labelWidth }}; "' +
                'margin-right: 4px;">{{ descriptor.name }}</label>';
        }
    };
    var linker = function(scope, element, attrs, formCtrl) {
        var readOnly = scope.readOnly();
        var name = scope.name();
        element.html(getTemplate(readOnly, name)).show();
        $compile(element.contents())(scope);
        scope.$watch('descriptor._isDupe_', function(nv) {
            formCtrl[name].$setValidity('unique', !nv);
        });
    };
    return {
        link : linker,
        restrict : 'E',
        transclude : true,
        require: '^form',
        scope : {
            name : '&',
            readOnly : '&',
            descriptor : '=',
            change : '='
        }
    };
});
