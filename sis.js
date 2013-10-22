angular.module('sis',[]).config(function($routeProvider) {
    $routeProvider.
        when('/',{controller:SchemaListCtrl, templateUrl:'schema_list.html'}).
        when('/list/:schema',{controller:EntityListCtrl, templateUrl:'entity_list.html'}).
        when('/edit/:schema/:id',{controller:EntityEditCtrl, templateUrl:'entity_edit.html'}).
        when('/remove/:schema/:id',{controller:EntityRemoveCtrl, templateUrl: 'entity_remove.html'}).
        when('/create/:schema',{controller:EntityCreateCtrl, templateUrl:'entity_create.html'}).
        otherwise({redirectTo:'/'});
});

function SchemaListCtrl($scope,$http) {
    $scope.refresh = function() {
        $http.get("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/schemas")
        .success(function(data) {
            $scope.schemas = data;
        })
        .error(function(data,status) {
            alert("Unable to fetch data from SIS: "+data+":"+status);
        });
    };
    $scope.refresh();
}

function SchemaEditCtrl($scope,$http,$routeParams) {
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
            var not = $('<div class="alert alert-success">This entity has been successfully updated.</div>');
            $('#notification_area').append(not);
            not.fadeOut(2500,function() {
                not.remove();
            });
            $location.path('/list/'+$scope.schema);
        })
        .error(function(data,status) {
            alert("Failed to update data in SIS: "+JSON.stringify($scope.doc)+": "+status);
        });
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
            var not = $('<div class="alert alert-success">This entity has been successfully created.</div>');
            $('#notification_area').append(not);
            not.fadeOut(2500,function() {
                not.remove();
            });
            $location.path('/list/'+$scope.schema);
        })
        .error(function(data,status) {
            alert("Failed to update data in SIS: "+JSON.stringify($scope.doc)+": "+status);
        });
    }
    $scope.onload();
}

function EntityRemoveCtrl($scope,$http,$routeParams,$location) {
    $scope.id = $routeParams.id;
    $scope.schema = $routeParams.schema;

    $scope.remove_entity = function() {
        $http.delete("http://sis-node1.dev-bo.iad1.vrsn.com/api/v1/entities/"+$scope.schema+'/'+$scope.id)
        .success(function(data) {
            var not = $('<div class="alert alert-success">Entity has been successfully removed.</div>');
            $('#notification_area').append(not);
            not.fadeOut(2500,function() {
                not.remove();
            });
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

