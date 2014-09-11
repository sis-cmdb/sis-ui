angular.module('sisui')
.controller("CodeEditorController", function($scope, $modalInstance) {

    var descriptor = $scope.descriptor;
    var code = $scope.code || "";
    var readOnly = $scope.readOnly;

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
            var type = descriptor.code || "text";
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
