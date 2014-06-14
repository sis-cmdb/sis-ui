// schema descriptor
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
        var result = (type === "Array" || type === "Document") &&
               path !== "definition.owner" &&
               (path === "definition" ||
                // ensure it's within the definition
               $scope.isEntityDescriptor());
        if (!result) {
            return false;
        }
        // a little more validation
        if (!$scope.descriptor.name) {
            // only ok if the parent of this is an array
            return $scope.descriptor._parent_.type === "Array";
        }
        return true;
    };

    $scope.canAddChildren = function() {
        var descriptor = $scope.descriptor;
        if (!descriptor.name) {
            return false;
        }
        if (descriptor.type === "Array") {
            return !descriptor.children ||
                    descriptor.children.length === 0;
        }
        return descriptor.type === "Document";
    };

    $scope.canModifyDescriptorName = function() {
        var descriptor = $scope.descriptor;
        if (descriptor._isNew_) {
            return !descriptor._parent_ ||
                descriptor._parent_.type != 'Array';
        }
        return false;
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
                if (child.name) {
                    doc[child.name] = childField;
                }
            }
        } else {
            doc = [];
            if (children.length) {
                doc.push(convertToSchemaField(children[0]));
            }
        }
        setSchemaField(parent, doc);
    };

    var assignValidity = function(fieldIndexes, desc) {
        var valid = fieldIndexes.length == 1;
        fieldIndexes.forEach(function(idx) {
            desc.children[idx]._isDupe_ = !valid;
        });
    };

    var updateDuplicateStatus = function(parent) {
        var names = parent.children.reduce(function(names, desc, idx) {
            names[desc.name] = names[desc.name] || [];
            names[desc.name].push(idx);
            return names;
        }, { });
        for (var k in names) {
            assignValidity(names[k], parent);
        }
    };

    $scope.addChildDescriptor = function() {
        var descriptor = $scope.descriptor;
        descriptor.children = descriptor.children || [];
        var newDesc = { type : "String", _parent_ : descriptor };
        newDesc._isNew_ = true;
        newDesc.name = "field";
        delete descriptor._max_field_len_;
        descriptor.children.push(newDesc);
        updateDuplicateStatus(descriptor);
        updateParentSchemaField(newDesc);
    };

    $scope.showAttrs = function() {
        var descriptor = $scope.descriptor;
        var modalScope = $scope.$new(true);
        modalScope.additionalFields = angular.copy($scope.additionalFields);
        modalScope.name = descriptor.name;
        modalScope.schemaList = $scope.schemaList;
        modalScope.descriptor = modalScope.additionalFields.reduce(function(ret, f) {
            if (typeof descriptor[f.name] !== 'undefined') {
                ret[f.name] = descriptor[f.name];
            }
            return ret;
        }, { });
        return $modal.open({
            templateUrl : "app/partials/schema-descriptor-attrs.html",
            scope : modalScope,
            controller : "SchemaAttrsDescriptorController",
            windowClass : "narrow-modal-window"
        }).result.then(function(attrs) {
            modalScope.additionalFields.forEach(function(f) {
                if (attrs[f.name] || attrs[f.name] === 0) {
                    descriptor[f.name] = attrs[f.name];
                } else {
                    delete descriptor[f.name];
                }
            });
            setSchemaField(descriptor, convertToSchemaField(descriptor));
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
                for (i = 0; i < descriptor.children.length; ++i) {
                    var child = descriptor.children[i];
                    result.type[child.name] = convertToSchemaField(child);
                }
            }
        }
        // cannot use $scope.additionalFields here since
        // we are not necessarily in the descriptors scope due to
        // recursion
        var additionalFields = SisUtil.attributesForType(descriptor.type);
        for (i = 0; i < additionalFields.length; ++i) {
            var field = additionalFields[i];
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

    $scope.nameChanged = function(descriptor) {
        // ensure we're the only one with this name
        updateDuplicateStatus(descriptor._parent_);
        var valid = !descriptor._isDupe_;
        if (!valid) {
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
                    _parent_ : descriptor,
                    _isNew_ : true
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
        updateDuplicateStatus(parent);
    };

    $scope.getErrorMsg = function(field) {
        if (!field) { return ""; }
        for (var k in field.$error) {
            if (field.$error[k]) {
                return "Invalid : (" + k + ")";
            }
        }
        return "";
    };

    $scope.validDescriptorTypes = SisUtil.descriptorTypes;
    if ($scope.descriptor._parent_ &&
        $scope.descriptor._parent_.type == "Array") {
        var types = angular.copy(SisUtil.descriptorTypes);
        var idx = types.indexOf('Array');
        if (idx != -1) {
            types.splice(idx, 1);
            $scope.validDescriptorTypes = types;
        }
    }

    $scope.additionalFields = SisUtil.attributesForType($scope.descriptor.type);

    $scope.value = "<not set>";
    if ($scope.isSchemaValue()) {
        $scope.value = $scope.schema[$scope.descriptor.name];
        if ($scope.descriptor.name == "owner" &&
            !$scope.descriptor.enum &&
            !$scope.value.length) {
            $scope.value = "";
        }
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

    if ($scope.descriptor.match &&
        $scope.descriptorForm &&
        $scope.descriptorForm.valueField) {
        var regex = SisUtil.toRegex($scope.descriptor.match);
        if (regex) {
            $scope.descriptorForm.valueField.$parsers.push(function(viewValue) {
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

});
