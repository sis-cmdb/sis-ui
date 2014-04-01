
angular.module('sisui')
.controller("SchemaDescriptorController", function($scope, SisUtil, $log) {
    "use strict";

    $scope.paths = SisUtil.getDescriptorPath($scope.descriptor);
    $scope.path = $scope.paths.join(".");

    $scope.isEntityDescriptor = function() {
        return $scope.paths.length > 1;
    };

    $scope.canModifyDescriptor = function() {
        var path = $scope.path;
        return $scope.isEntityDescriptor() &&
               path !== "definition.owner" &&
               path !== "definition.sis_locked";
    };

    $scope.canModifyDescriptorName = function() {
        var path = $scope.path;
        var descriptor = $scope.descriptor;
        return $scope.canModifyDescriptor() &&
               descriptor._parent_.type !== "Array";
    };

    $scope.inputType = function() {
        return SisUtil.getInputType($scope.descriptor.type);
    };

    $scope.isSchemaValue = function() {
        return $scope.paths.length == 1 &&
               $scope.path != "definition";
    };


    $scope.canModifyChildren = function() {
        var path = $scope.path;
        var type = $scope.descriptor.type;
        return (type === "Array" || type === "Document") &&
               path !== "definition.owner" &&
               (path === "definition" ||
               $scope.isEntityDescriptor());
    };

    $scope.canAddChildren = function() {
        var descriptor = $scope.descriptor;
        if (descriptor.type === "Array") {
            return !descriptor.children ||
                    descriptor.children.length === 0;
        }
        return descriptor.type === "Document";
    };

    $scope.addChildDescriptor = function() {
        var descriptor = $scope.descriptor;
        descriptor.children = descriptor.children || [];
        var newDesc = { type : "String", _parent_ : descriptor };
        if (descriptor.type === "Document") {
            newDesc.name = "";
        }
        descriptor.children.push(newDesc);
    };

    var convertToSchemaField = function(descriptor) {
        var result = {
            type : descriptor.type
        };
        var i = 0;
        if (descriptor.type === "Array") {
            if (descriptor.children &&
                descriptor.children.length) {
                result.type = [convertToSchemaField(descriptor.children[0])];
            } else {
                result.type = [];
            }
        } else if (descriptor.type === "Document") {
            if (descriptor.children && descriptor.children.length) {
                result.type = { };
                for (i = 0; i < descriptor.children; ++i) {
                    var child = descriptor.children[i];
                    result.type[child.name] = convertToSchemaField(child);
                }
            }
        }
        for (i = 0; i < $scope.checkboxFields.length; ++i) {
            var field = $scope.checkboxFields[i];
            if (!descriptor[field]) {
                delete result[field];
            } else {
                result[field] = true;
            }
        }
        if (Object.keys(result).length == 1) {
            result = result.type;
        }

        return result;
    };

    var updateParentSchemaField = function(descriptor) {
        var parent = descriptor._parent_;
        var doc = null;
        var children = parent.children || [];
        if (parent.type === "Document") {
            doc = { };
            for (var i = 0; i < children.length; ++i) {
                var child = parent.children[i];
                var childField = convertToSchemaField(child);
                doc[child.name] = childField;
            }
        } else {
            doc = [];
            if (children.length) {
                doc.push(convertToSchemaField(children[0]));
            }
        }
        setSchemaField(parent, doc);
    };

    $scope.nameChanged = function(descriptor) {
        // ensure we're the only one with this name
        var withName = descriptor._parent_.children.filter(function(cd) {
            return cd.name == descriptor.name;
        });
        if (withName.length > 1) {
            $log.debug("Fields with the same name exist.");
            return;
        }
        // update our path and
        // children paths
        $scope.paths = SisUtil.getDescriptorPath(descriptor);
        $scope.path = $scope.paths.join(".");
        $scope.$broadcast("parentPathChanged");

        // update the parent document and the
        // schema JSON object ($scope.schema)
        // this is to take care of any weird case
        // where two fields had the same name prior to this
        // change
        updateParentSchemaField(descriptor);
    };

    var setSchemaField = function(descriptor, value) {
        var paths = SisUtil.getDescriptorPath(descriptor);
        var doc = $scope.schema;
        for (var i = 0; i < paths.length - 1; ++i) {
            if (doc instanceof Array) {
                if (!doc.length) {
                    doc.push({ type : "Mixed" });
                }
                doc = doc[0];
            } else {
                // it's an object
                doc = doc[paths[i]];
            }
            if (doc.type &&
                typeof doc.type === 'object') {
                // inner document
                doc = doc.type;
            }
        }
        if (doc instanceof Array) {
            doc[0] = value;
        } else {
            doc[descriptor.name] = value;
        }
    };

    $scope.toggleChoice = function(choice) {
        var descriptor = $scope.descriptor;
        var schema = $scope.schema;
        var value = schema[descriptor.name];
        var idx = value.indexOf(choice);
        if (idx == -1) {
            value.push(choice);
        } else {
            value.splice(idx, 1);
        }
    };

    $scope.typeChanged = function(descriptor) {
        if (descriptor.type == "Document" ||
            descriptor.type == "Array") {
            descriptor.children = [];
            if (descriptor.type == "Document") {
                descriptor.children.push({
                    name: "field",
                    type: "String",
                    _parent_ : descriptor
                });
            }
        } else {
            delete descriptor.children;
        }
        // update the schema descriptor object
        setSchemaField(descriptor, convertToSchemaField(descriptor));
    };

    $scope.attrChanged = function(descriptor) {
        setSchemaField(descriptor, convertToSchemaField(descriptor));
    };

    $scope.$on("parentPathChanged", function() {
        $scope.paths = SisUtil.getDescriptorPath($scope.descriptor);
        $scope.path = $scope.paths.join(".");
    });

    $scope.schemaValueChanged = function(value) {
        var descriptor = $scope.descriptor;
        if (descriptor.name == 'owner') {
            if (typeof value === 'string') {
                value = value.split(",").map(function(s) {
                    return s.trim();
                });
            }
            value = value.sort();
            $scope.schema.owner = value;
        } else {
            $scope.schema[descriptor.name] = value;
        }
    };

    // only called within canModifyDescriptor block
    $scope.canDelete = function() {
        var descriptor = $scope.descriptor;
        if (descriptor._parent_.type === 'Document') {
            return descriptor._parent_.children.length > 1;
        }
        return true;
    };

    // only called within canModifyDescriptor block
    $scope.deleteDescriptor = function() {
        var descriptor = $scope.descriptor;
        var parent = descriptor._parent_;
        if (parent.type === "Document") {
            var i = 0;
            for (i = 0; i < parent.children.length; ++i) {
                if (parent.children[i] == descriptor) {
                    break;
                }
            }
            parent.children.splice(i, 1);
        } else {
            parent.children = [];
        }
        updateParentSchemaField(descriptor);
        delete descriptor._parent_;
    };

    $scope.validDescriptorTypes = ["Boolean", "String", "Number", "Mixed",
                                   "Document", "Array"];

    $scope.checkboxFields = ["required", "unique"];

    $scope.value = "<not set>";
    if ($scope.isSchemaValue()) {
        $scope.value = $scope.schema[$scope.descriptor.name];
    }

    $scope.isCollapsed = false;

});

// controller for editing/creating schemas
angular.module('sisui')
.controller("ModSchemaController", function($scope, $modalInstance,
                                            SisUtil, SisClient) {
    "use strict";

    var ownerDescriptor = {
        name : "owner",
        required : true,
        type : "String"
    };
    var adminGroups = SisUtil.getAdminRoles();
    if (adminGroups instanceof Array) {
        ownerDescriptor.enum = adminGroups;
        ownerDescriptor.type = "Array";
    }

    $scope.schema.owner.sort();

    var schemaDefinitionDescriptor = { name : "definition", type : "Document" };
    var entityDescriptors = SisUtil.getDescriptorArray($scope.schema);

    entityDescriptors = entityDescriptors.map(function(ed) {
        ed._parent_ = schemaDefinitionDescriptor;
        return ed;
    }).filter(function(ed) {
        return ed.name !== "owner";
    });

    schemaDefinitionDescriptor.children = entityDescriptors;


    var descriptors = [
        { name : "name", type : "String", required : true, readonly : $scope.action == 'edit' },
        ownerDescriptor,
        { name : "sis_locked", type : "Boolean" },
        schemaDefinitionDescriptor
    ];

    var orig = angular.copy($scope.schema);
    $scope.descriptors = descriptors;

    $scope.hasChanged = function() {
        return !angular.equals(orig, $scope.schema);
    };

    $scope.save = function() {
        var name = $scope.schema.name;
        var endpoint = SisClient.schemas;
        var func = endpoint.create;
        if ($scope.action === 'edit') {
            func = endpoint.update;
        }
        func($scope.schema, function(err, res) {
            if (!err) {
                $modalInstance.close(res);
            }
        });
    };

    switch ($scope.action) {
        case 'add':
            $scope.modalTitle = "Add a new schema";
            break;
        case 'edit':
            $scope.modalTitle = "Modify Schema - " + $scope.schema.name;
            break;
        default:
            $scope.modalTitle = "<error>";
            break;
    }
});


