angular.module('sis',[]).config(function($routeProvider) {
    $routeProvider.
        when('/',{controller:SchemaListCtrl, templateUrl:'schema_list.html'}).
        when('/create',{controller:SchemaCreateCtrl, templateUrl: 'schema_create.html'}).
        when('/edit/:schema',{controller:SchemaEditCtrl,templateUrl:'schema_edit.html'}).
        when('/remove/:schema',{controller:SchemaRemoveCtrl,templateUrl:'schema_remove.html'}).
        when('/list/:schema',{controller:EntityListCtrl, templateUrl:'entity_list.html'}).
        when('/edit/:schema/:id',{controller:EntityEditCtrl, templateUrl:'entity_edit.html'}).
        when('/remove/:schema/:id',{controller:EntityRemoveCtrl, templateUrl: 'entity_remove.html'}).
        when('/create/:schema',{controller:EntityCreateCtrl, templateUrl:'entity_create.html'}).
        otherwise({redirectTo:'/'});
});

function notify(msg) {
    var not = $('<div class="alert alert-success">'+msg+'</div>');
    $('#notification_area').append(not);
    not.fadeOut(3500,function() {
        not.remove();
    });
}

function SchemaListCtrl($scope,$http) {
    $scope.record_count = 0;
    $scope.refresh = function() {
        $http.get("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas")
        .success(function(data) {
            $scope.schemas = data;
            $scope.record_count = data.length;

        })
        .error(function(data,status) {
            alert("Unable to fetch data from SIS: "+data+":"+status);
        });
    };
    $scope.refresh();
}

function SchemaEditCtrl($scope,$http,$routeParams) {
    $scope.schema = $routeParams.schema;
    $scope.onload = function() {
        $http.get("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas/"+$scope.schema)
        .success(function(data) {
            $scope.doc = data;
            $scope.doc.definition = JSON.stringify(data.definition);
        })
        .error(function(data,status) {
            alert("Unable to fetch data from SIS: "+data+":"+status);
        });
    }
    $scope.save = function() {
        delete $scope.doc._id;
        delete $scope.doc.__v;
        $scope.definition = JSON.parse($scope.definition);
        $http({
            "method": "PUT",
            "url": "http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas/"+$scope.schema,
            "data": JSON.stringify($scope.doc),
            "headers": {
                "Content-type": "application/json"
            },
        })
        .success(function(data) {
            notify('This schema has been successfully updated.');
            $location.path('/');
        })
        .error(function(data,status) {
            alert("Failed to update data in SIS: "+JSON.stringify($scope.doc)+": "+status);
        });
    }
    $scope.back = function() {
        window.history.back();
    }
    $scope.onload();
    
}
function SchemaCreateCtrl($scope,$http,$location) {

    // Grab existing data, and pop open a modal with a form
    // ----------------------------------------------------
    $scope.onload = function() {
        $scope.doc = {
            "name" : '',
            "owner" : '',
            "definition" : '',
        };
    };
    $scope.create = function() {
        $scope.definition = JSON.parse($scope.definition);
        $http({
            "method": "POST",
            "url": "http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas/",
            "data": JSON.stringify($scope.doc),
            "headers": {
                "Content-type": "application/json"
            },
        })
        .success(function(data) {
            notify('This schema has been successfully created.');
            $location.path('/');
        })
        .error(function(data,status) {
            alert("Failed to update data in SIS: "+JSON.stringify($scope.doc)+": "+status);
        });
    }
    $scope.back = function() {
        window.history.back();
    }
    $scope.onload();
}
function SchemaRemoveCtrl($scope,$http,$routeParams,$location) {
    $scope.schema = $routeParams.schema;

    $scope.remove_schema = function() {
        $http.delete("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas/"+$scope.schema)
        .success(function(data) {
            notify('This schema has been successfully removed.');
            $location.path('/');
        })
        .error(function(data,status) {
            alert("Unable to fetch data from SIS: "+data+":"+status);
        });
    }
    $scope.back = function() {
        window.history.back();
    }
}

function EntityListCtrl($scope,$http,$routeParams) {
    $scope.schema = $routeParams.schema;
    $scope.refresh = function() {
        // First get schema definition so we can display column names
        // ----------------------------------------------------------
        $http.get("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas/"+$scope.schema)
        .success(function(data) {
            $scope.defkeys = [];
            for(var k in data.definition) {
              $scope.defkeys.push(k);
            }
            $http.get("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/entities/"+$scope.schema)
            .success(function(data) {
                $scope.docs = data;
                $scope.record_count = data.length;
            })
            .error(function(data,status) {
                alert("Unable to fetch data from SIS: "+data+":"+status);
            });
        })
        .error(function(data,status) {
            alert("Unable to fetch data from SIS: "+data+":"+status);
        });

    };
    $scope.back = function() {
        window.history.back();
    }
    $scope.refresh();
}
function EntityEditCtrl($scope,$http,$routeParams,$location) {
    $scope.id = $routeParams.id;
    $scope.schema = $routeParams.schema;

    // Grab existing data, and pop open a modal with a form
    // ----------------------------------------------------
    $scope.onload = function() {
        // First get schema definition so we can display column names
        // ----------------------------------------------------------
        $http.get("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas/"+$scope.schema)
        .success(function(data) {
            $scope.defkeys = [];
            for(var k in data.definition) {
              $scope.defkeys.push(k);
            }
            $http.get("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/entities/"+$scope.schema+'/'+$scope.id)
            .success(function(data) {
                $scope.doc = data;
            })
            .error(function(data,status) {
                alert("Unable to fetch data from SIS: "+data+":"+status);
            });
        })
        .error(function(data,status) {
            alert("Unable to fetch data from SIS: "+data+":"+status);
        });

    };
    $scope.save = function() {
        delete $scope.doc._id;
        delete $scope.doc.__v;
        $http({
            "method": "PUT",
            "url": "http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/entities/"+$scope.schema+'/'+$scope.id,
            "data": JSON.stringify($scope.doc),
            "headers": {
                "Content-type": "application/json"
            },
        })
        .success(function(data) {
            notify('This entity has been successfully updated.');
            $location.path('/list/'+$scope.schema);
        })
        .error(function(data,status) {
            alert("Failed to update data in SIS: "+JSON.stringify($scope.doc)+": "+status);
        });
    }
    $scope.back = function() {
        window.history.back();
    }
    $scope.onload();
}
function EntityCreateCtrl($scope,$http,$routeParams,$location) {
    $scope.schema = $routeParams.schema;

    // Grab existing data, and pop open a modal with a form
    // ----------------------------------------------------
    $scope.onload = function() {
        // First get schema definition so we can display column names
        // ----------------------------------------------------------
        $http.get("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas/"+$scope.schema)
        .success(function(data) {
            $scope.defkeys = [];
            $scope.doc = {};
            for(var k in data.definition) {
              $scope.defkeys.push(k);
              $scope.doc[k] = '';
            }
        })
        .error(function(data,status) {
            alert("Unable to fetch data from SIS: "+data+":"+status);
        });

    };
    $scope.create = function() {
        $http({
            "method": "POST",
            "url": "http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/entities/"+$scope.schema,
            "data": JSON.stringify($scope.doc),
            "headers": {
                "Content-type": "application/json"
            },
        })
        .success(function(data) {
            notify('This entity has been successfully created.');
            $location.path('/list/'+$scope.schema);
        })
        .error(function(data,status) {
            alert("Failed to update data in SIS: "+JSON.stringify($scope.doc)+": "+status);
        });
    }
    $scope.back = function() {
        window.history.back();
    }
    $scope.onload();
}

function EntityRemoveCtrl($scope,$http,$routeParams,$location) {
    $scope.id = $routeParams.id;
    $scope.schema = $routeParams.schema;

    $scope.remove_entity = function() {
        $http.delete("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/entities/"+$scope.schema+'/'+$scope.id)
        .success(function(data) {
            notify('Entity has been successfully removed.');
            $location.path('/list/'+$scope.schema);
        })
        .error(function(data,status) {
            alert("Unable to fetch data from SIS: "+data+":"+status);
        });
    }
    $scope.back = function() {
        window.history.back();
    }
}

