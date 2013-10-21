angular.module('sis',[]).config(function($routeProvider) {
    $routeProvider.
        when('/',{controller:SchemaListCtrl, templateUrl:'schema_list.html'}).
        when('/show/:schema',{controller:SchemaShowCtrl, templateUrl:'schema_show.html'}).
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

function SchemaShowCtrl($scope,$http,$routeParams) {
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
