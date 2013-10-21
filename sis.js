angular.module('sis',[]).config(function($routeProvider) {
    $routeProvider.
        when('/',{controller:SchemaListCtrl, templateUrl:'schema_list.html'}).
        when('/show/:schema',{controller:EntityListCtrl, templateUrl:'entity_list.html'}).
        when('/edit/:schema/:id',{controller:EntityEditCtrl, templateUrl:'entity_edit.html'}).
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
function EntityEditCtrl($scope,$http,$routeParams) {
    $scope.id = $routeParams.id;
    $scope.schema = $routeParams.schema;

    // Grab existing data, and pop open a modal with a form
    // ----------------------------------------------------
}
