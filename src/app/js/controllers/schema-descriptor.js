// schema descriptor
angular.module('sisui')
.controller("SchemaDescriptorController", function($scope, SisUtil,
                                                   $modal, $log) {
    "use strict";

    $scope.paths = SisUtil.getDescriptorPath($scope.descriptor);
    $scope.path = $scope.paths.join(".");

    $scope.isEntityDescriptor = function() {
        return $scope.paths.length > 1 &&
               $scope.paths[0] === 'definition';
    };

    $scope.canModifyDescriptor = function() {
        return $scope.isEntityDescriptor();
    };

    $scope.inputType = function() {
        return SisUtil.getInputType($scope.descriptor.type);
    };

    // returns a boolean if the descriptor represents a value
    // that needs to be set on the schema object.
    // basically any key in the root object (name, _sis.*, etc.)
    // fields within the definition object do not apply
    $scope.isSchemaValue = function() {
        return ($scope.paths.length == 1 &&
                $scope.path != "definition" &&
                $scope.path != '_sis') ||
                $scope.path.indexOf('_sis.') === 0;
    };

    $scope.canModifyChildren = function() {
        var path = $scope.path;
        var type = $scope.descriptor.type;
        if (path === '_sis') {
            return true;
        }
        var result = (type === "Array" || type === "Document") &&
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
        if ($scope.path === "_sis") {
            return false;
        }
        var descriptor = $scope.descriptor;
        if (descriptor.type === "Document") {
            return true;
        }
        if (!descriptor.name) {
            return false;
        }
        if (descriptor.type === "Array") {
            return !descriptor.children ||
                    descriptor.children.length === 0;
        }
        return true;
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
        // such a dirty dirty hack - see util.js and how it deletes
        // enum from the child if it's an array (getArrayDescriptor)
        var isArrayEnum = (descriptor._parent_ &&
            descriptor._parent_.type == "Array" &&
            descriptor._parent_.enum);

        if (isArrayEnum) {
            // actually the enum belongs to us
            modalScope.descriptor.enum = descriptor._parent_.enum;
        }
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
            if (isArrayEnum) {
                // update the parent too
                descriptor._parent_.enum = descriptor.enum;
            }
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
                    var values = SisUtil.toStringArray(descriptor[fieldName]);
                    result[fieldName] = values;
                } else if (field.type == 'select' && fieldName == "ref") {
                    result[fieldName] = descriptor[fieldName].name;
                } else {
                    result[fieldName] = descriptor[fieldName];
                }
            }
        }
        if (Object.keys(result).length == 1) {
            if (descriptor.name === "type") {
                // a field named type.  This can cause problems
                result = { type : result.type };
            } else {
                result = result.type;
            }
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
            // check if the document has a type
            // field and if that is an embedded schema
            // or a field named "type"
            if (doc.type &&
                typeof doc.type === 'object') {
                if (typeof doc.type.type !== "string") {
                    // inner document
                    doc = doc.type;
                }
            }
        }
        if (doc instanceof Array) {
            doc[0] = value;
        } else {
            doc[descriptor.name] = value;
        }
    };

    function getSchemaValue(schema, paths) {
        var result = schema;
        paths.forEach(function(p) {
            result = result[p];
        });
        return result;
    }

    $scope.isSelected = function(choice) {
        var paths = $scope.paths;
        var schema = $scope.schema;
        var arrayValue = getSchemaValue(schema, paths);
        if (arrayValue instanceof Array) {
            return arrayValue.indexOf(choice) >= 0;
        }
        return false;
    };

    $scope.toggleChoice = function(choice) {
        var paths = $scope.paths;
        var schema = $scope.schema;
        var arrayValue = getSchemaValue(schema, paths);
        if (arrayValue instanceof Array) {
            var idx = arrayValue.indexOf(choice);
            if (idx == -1) {
                arrayValue.push(choice);
            } else {
                arrayValue.splice(idx, 1);
            }
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
        var paths = $scope.paths;
        if (paths[0] === '_sis') {
            if (descriptor.name === "owner") {
                if (typeof value === 'string') {
                    value = SisUtil.toStringArray(value);
                }
                value = value.sort();
                $scope.schema._sis.owner = value;
            } else if (descriptor.name === "tags") {
                value = SisUtil.toStringArray(value);
                $scope.schema._sis.tags = value;
            } else {
                $scope.schema._sis[descriptor.name] = value;
            }
        } else if (descriptor.name == "locked_fields") {
            if (typeof value === 'string') {
                value = SisUtil.toStringArray(value);
            }
            $scope.schema.locked_fields = value;
        } else {
            $scope.schema[descriptor.name] = value;
        }
    };

    // only called within canModifyDescriptor block
    $scope.canDelete = function() {
        var descriptor = $scope.descriptor;
        var paths = SisUtil.getDescriptorPath(descriptor);
        // remove the definition part of the path
        paths.shift();
        var path = paths.join(".");
        if ($scope.originalLockedFields.indexOf(path) >= 0 ||
            $scope.schema.locked_fields.indexOf(path) >= 0) {
            return false;
        }
        if (descriptor._parent_.type === 'Document') {
            return descriptor._parent_.children.length > 1;
        }
        return true;
    };

    var doDeleteDescriptor = function() {
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

    // only called within canModifyDescriptor block
    $scope.deleteDescriptor = function() {
        var descriptor = $scope.descriptor;
        if (!descriptor.name || descriptor._isNew_) {
            return doDeleteDescriptor();
        }
        var title = "Confirm delete";
        var body = "Are you sure you want to delete field '" + descriptor.name + "'";
        $scope.sisDlg.openConfirmDialog(title, body).result.then(function(ok) {
            doDeleteDescriptor();
        });
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
        if ($scope.paths[0] === '_sis') {
            $scope.value = $scope.schema._sis[$scope.descriptor.name];
            if ($scope.descriptor.name == "owner" &&
                !$scope.descriptor.enum &&
                !$scope.value.length) {
                $scope.value = "";
            }
        } else {
            $scope.value = $scope.schema[$scope.descriptor.name];
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

    if ($scope.descriptor.name == "locked_fields" &&
        !$scope.descriptor.parent) {
        // handle the lock all msg
        $scope.$on("locked_fields_updated", function() {
            $scope.value = $scope.schema.locked_fields.join(", ");
        });
    }

});
