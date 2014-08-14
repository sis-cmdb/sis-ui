angular.module('sisui')
.directive('sisEntityInput', function($compile, SisUtil, $state) {
    "use strict";
    // returns a select or input element
    // based on descriptor
    // will setup valueChanged and the model
    var getTemplate = function(descriptor, path, action) {
        var attrs = [
            'ng-model="fieldValue"',
            'name="' + path.replace(/\./g, '_') + '"'
        ];
        if (descriptor.required) {
            attrs.push("required");
        }
        var elem = "input";
        var isObjectRef = (descriptor.type == 'ObjectId' && descriptor.ref);
        if (descriptor.enum) {
            // select
            elem = "select";
            attrs.push('ng-options="choice for choice in fieldDescriptor().enum"');
            attrs.push('ng-change="valueChanged(fieldValue)"');
        } else {
            // input
            var inputType = SisUtil.getInputType(descriptor.type);
            attrs.push('type="' + inputType + '"');
            attrs.push('class="form-control input-sm"');
            if ('min' in descriptor) {
                attrs.push('min="' + descriptor.min + '"');
            }
            if ('max' in descriptor) {
                attrs.push('max="' + descriptor.max + '"');
            }
            // refs are special
            if (isObjectRef) {
                attrs.push('disabled="disabled"');
                attrs.push('placeholder="ObjectId (' + descriptor.ref + ')"');
            } else {
                attrs.push('placeholder="' + (descriptor.comment || descriptor.type) + '"');
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
        element.html(getTemplate(descriptor, path, scope.action)).show();
        $compile(element.contents())(scope);
        if (!ctrl || !ctrl[path]) {
            return;
        }
        scope.$state = $state;
        var elementOffset = element.offset().left;

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
        if (descriptor.type == "IpAddress") {
            ctrl.$parsers.unshift(function(viewValue) {
                if (!viewValue) {
                    ctrl.$setValidity('ip', true);
                    return viewValue;
                }
                var addr = null;
                if (viewValue.indexOf(':') != -1) {
                    addr = new v6.Address(viewValue);
                } else {
                    addr = new v4.Address(viewValue);
                }
                ctrl.$setValidity('ip', addr.isValid());
                return addr.isValid() ? viewValue : undefined;
            });
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
            valueChanged : '=',
            action : "="
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
            if (formCtrl && formCtrl[name]) {
                formCtrl[name].$setValidity('unique', !nv);
            }
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
})
.directive("sisDocumentation", function($compile, $http, $templateCache,
                                        $location, $window, $rootScope) {
    // Shoutout to https://gist.github.com/alxhill/6886760
    // for the scroll spy sim
    var setup = function(scope, element) {
        var leftCol = element.find("#_doc_left");
        var rightCol = element.find("#_doc_right");
        var toc = leftCol.find("#table-of-contents");
        if (toc) {
            // apply it
            var ul = toc.next('ul');
            ul = $(ul);
            var spies = [];
            ul.find("a").each(function() {
                var a = $(this);
                var href = a.attr("href");
                a.removeAttr('href');
                href = href.substring(1);
                spies.push({
                    id : href,
                    elem : leftCol.find('#' + href),
                    menuElem : a.parent()
                });
                a.click(function() {
                    scope.$apply(function() {
                        $location.hash(href);
                    });
                });
            });
            var content = toc.next("h1");
            ul.addClass('nav affix');
            ul.attr("role", "complementary");
            ul.children('li').children('ul').addClass('expand');

            rightCol.append(ul);
            toc.remove();

            rightCol.find('table').addClass('table');

            var jqRight = $("#_doc_right");

            var updateToc = function() {
                jqRight.find('li > ul').not('.expand').addClass('collapse');
                jqRight.find('li.active > ul').removeClass('collapse');
            };

            var setActive = function(elem, func) {
                while (elem.prop("tagName") == "LI") {
                    elem[func]('active');
                    elem = elem.parent();
                    if (elem.prop("tagName") == "UL") {
                        elem = elem.parent();
                    }
                }
            };

            if ($rootScope.embedded) {
                rightCol.hide();
            }

            var jqWindow = $($window);
            var highlightSpy = null;
            var scrollHandler = function(e) {
                var currentSpy = null;
                spies.forEach(function(spy) {
                    var offset = spy.elem.offset();
                    if (!offset) { return; }
                    var pos = offset.top;
                    if (pos - $window.scrollY <= 0) {
                        spy.pos = pos;
                        if (!currentSpy) {
                            currentSpy = spy;
                        }
                        if (currentSpy.pos < spy.pos) {
                            currentSpy = spy;
                        }
                    }
                });

                if (currentSpy != highlightSpy) {
                    scope.$apply(function() {
                        if (highlightSpy) {
                            setActive(highlightSpy.menuElem, 'removeClass');
                        }
                        if (currentSpy) {
                            setActive(currentSpy.menuElem, 'addClass');
                        }
                        highlightSpy = currentSpy;
                        updateToc();
                    });
                }
            };

            var endsWith = function(str, suffix) {
               return str.indexOf(suffix, str.length - suffix.length) !== -1;
            };

            leftCol.find("a").each(function() {
                var a = $(this);
                var ref = a.attr("href");
                if (ref[0] == '.' && endsWith(ref, '.md')) {
                    var page = ref.split('/').pop().split('.')[0];
                    a.removeAttr('href');
                    a.click(function() {
                        scope.$state.go("docs", { doc : page });
                    });
                } else if (ref[0] == "#") {
                    a.removeAttr("href");
                    ref = ref.substring(1);
                    a.click(function() {
                        scope.$apply(function() {
                            $location.hash(ref);
                        });
                    });
                }
            });

            jqWindow.scroll(scrollHandler);
            updateToc();
            scope.$on("$destroy", function() {
                jqWindow.off('scroll', scrollHandler);
            });
        }
    };

    return {
        link : setup,
        restrict : "E",
    };
})
.directive("sisUserstatus", function() {
    return {
        restrict : "E",
        replace : true,
        templateUrl : "app/partials/user-dropdown.html",
        controller : "UserDropdownController"
    };
});
