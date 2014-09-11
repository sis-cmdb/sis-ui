angular.module('sisui')
.controller("CodeEditorController", function($scope, $modalInstance) {

    var descriptor = $scope.descriptor;
    var code = $scope.code || "";
    var readOnly = $scope.readOnly;

    var initEditor = function(editor) {
        editor.setReadOnly(readOnly);
        editor.setValue(code);
        if (descriptor.type == "Mixed") {
            editor.getSession().setMode("ace/mode/json");
        } else {
            var type = descriptor.code || "text";
            editor.getSession().setMode("ace/mode/" + type);
        }
    };

    $scope.save = function() {
        var result = editor.getValue();
        $modalInstance.close(result);
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
