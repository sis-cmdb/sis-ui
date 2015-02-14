angular.module('sisui')
.controller("CodeEditorController", function($scope, $modalInstance) {

    var descriptor = $scope.descriptor;
    var code = $scope.code || "";
    var readOnly = $scope.readOnly;
    var entity = $scope.entity;

    var codeMap = {
        "text/javascript" : "javascript",
        "application/javascript" : "javascript",
    };

    function getCodeType() {
        if (typeof descriptor.code === 'string') {
            return descriptor.code;
        } else if (descriptor.code_type_field) {
            // try to find it
            var fieldName = descriptor.code_type_field;
            if (entity && entity[fieldName]) {
                var type = entity[fieldName];
                if (type in codeMap) {
                    return codeMap[type];
                }
            }
        }
        return "text";
    }

    var initEditor = function(editor) {
        editor.setReadOnly(readOnly);
        if (descriptor.type == "Mixed") {
            if (typeof code == "string") {
                try {
                    code = angular.fromJson(code);
                } catch (ex) {
                    code = { };
                }
            }
            code = angular.toJson(code, true);
            editor.setValue(code);
            editor.getSession().setMode("ace/mode/json");
        } else {
            var type = getCodeType();
            editor.setValue(code);
            editor.getSession().setMode("ace/mode/" + type);
        }
    };

    $scope.save = function() {
        var result = editor.getValue();
        if (descriptor.type == "Mixed") {
            try {
                var parsed = angular.fromJson(result);
                $modalInstance.close(parsed);
            } catch(ex) {
                // ignore
            }
        } else {
            $modalInstance.close(result);
        }
    };

    var editor = null;
    $scope.setEditor = function(e) {
        editor = e;
        if (editor) {
            initEditor(editor);
        }
    };

    $scope.$on("$destroy", function() {
        if (editor) {
            editor.destroy();
        }
    });

});
