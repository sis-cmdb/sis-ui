
angular.module('sisui')
.controller("SchemaDescriptorController", function($scope, SisUtil,
                                                   $modal, $log) {
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

    // returns a boolean if the descriptor represents a value
    // that needs to be set on the schema object.
    // basically any key in the root object (name, sis_locked, etc.)
    // fields within the definition object do not apply
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

    $scope.showAttrs = function() {
        return $modal.open({
            templateUrl : "public/app/partials/schema-descriptor-attrs.html",
            scope : $scope,
            windowClass : "narrow-modal-window"
        });
    };

    var textToArray = function(text) {
        return text.split(",").map(function(s) {
            return s.trim();
        });
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
        for (i = 0; i < $scope.additionalFields.length; ++i) {
            var field = $scope.additionalFields[i];
            var fieldName = field.name;
            if (!descriptor[fieldName] &&
                descriptor[fieldName] !== 0) {
                delete result[fieldName];
            } else {
                if (field.type == 'textArray') {
                    var values = textToArray(descriptor[fieldName]);
                    result[fieldName] = values;
                } else if (field.type == 'select' && fieldName == "ref") {
                    result[fieldName] = descriptor[fieldName].name;
                } else {
                    result[fieldName] = descriptor[fieldName];
                }
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
        $scope.additionalFields.forEach(function(f) {
            delete descriptor[f.name];
        });
        $scope.additionalFields = SisUtil.attributesForType($scope.descriptor.type);
        // update the schema descriptor object
        setSchemaField(descriptor, convertToSchemaField(descriptor));
    };

    $scope.attrChanged = function(descriptor, f) {
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

    $scope.validDescriptorTypes = SisUtil.descriptorTypes;

    $scope.additionalFields = SisUtil.attributesForType($scope.descriptor.type);

    $scope.value = "<not set>";
    if ($scope.isSchemaValue()) {
        $scope.value = $scope.schema[$scope.descriptor.name];
    }

    if ($scope.descriptor.type == 'ObjectId' &&
        $scope.descriptor.ref) {
        for (var i = 0; i < $scope.schemaList.length; ++i) {
            var schema = $scope.schemaList[i];
            if (schema.name == $scope.descriptor.ref) {
                $scope.descriptor.ref = schema;
                break;
            }
        }
    }

});

// controller for editing/creating schemas
angular.module('sisui')
.controller("ModSchemaController", function($scope, $route, $location,
                                            SisSession, SisUtil, SisApi) {
    "use strict";

    var init = function(schema) {
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

        $scope.schema = schema;
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

        SisApi.getAllSchemas().then(function(schemas) {
            $scope.schemaList = schemas;
        });

        $scope.hasChanged = function() {
            return !angular.equals(orig, $scope.schema);
        };
    };

    var createEmptySchema = function() {
        return {
            name : "",
            owner : [],
            definition : {
                name : "String"
            },
            sis_locked : false,
            locked_fields : []
        };
    };

    var parseRoute = function() {
        if (!($route.current && $route.current.params)) {
            return $location.path("/schemas");
        }
        var params = $route.current.params;
        var action = params.action;
        var schemaName = params.schema;
        if (action == 'add' && !schemaName) {
            // adding a schema
            $scope.action = action;
            $scope.title = "Add a new schema";
            init(createEmptySchema());
        } else if (action == 'edit' && schemaName) {
            SisApi.getSchema(schemaName, true).then(function(schema) {
                $scope.action = action;
                $scope.title = "Modify schema " + schemaName;
                init(schema);
            }, function(err) {
                return $location.path("/schemas");
            });
        } else {
            return $location.path("/schemas");
        }
    };

    parseRoute();

    $scope.save = function() {
        var endpoint = SisApi.schemas;
        var name = $scope.schema.name;
        var func = endpoint.create;
        if ($scope.action === 'edit') {
            func = endpoint.update;
        }
        func($scope.schema).then(function(res) {
            SisSession.setSchemas(null);
            return $location.path("/schemas");
        });
    };

});


