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
        when('/list_hooks', {controller:HookListCtrl,templateUrl:'hook_list.html'}).
        when('/create_hooks',{controller:HookCreateCtrl,templateUrl:'hook_create.html'}).
        when('/remove_hooks/:hook',{controller:HookRemoveCtrl,templateUrl:'hook_remove.html'}).
        when('/edit_hooks/:hook',{controller:HookEditCtrl,templateUrl:'hook_edit.html'}).
        otherwise({redirectTo:'/'});
});
var SISClient = SIS.client({'url' : 'http://sis-node1.dev-bo.iad1.vrsn.com'});

function notify(msg) {
    var not = $('<div class="alert alert-success">'+msg+'</div>');
    $('#notification_area').append(not);
    not.fadeOut(3500,function() {
        not.remove();
    });
}

function alert_out(e) {
    alert(JSON.stringify(e));
}

function SchemaListCtrl($scope) {
    $scope.record_count = 0;
    $scope.schemas = [];
    $scope.refresh = function() {
        SISClient.schemas.list(function(err,data) {
            if(err) {
                alert("Getting here");
                alert_out(err);
                return;
            }
            $scope.$apply(function() {
                $scope.schemas = data;
                $scope.record_count = data.length;
            });
        });
    };
    $scope.refresh();
}

function SchemaEditCtrl($scope,$http,$routeParams) {
    $scope.schema = $routeParams.schema;
    $scope.onload = function() {
        SISClient.schemas.get($scope.schema,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            $scope.$apply(function() {
                $scope.doc = data;
                $scope.doc.definition = JSON.stringify(data.definition);
            });
        });
    }
    $scope.save = function() {
        delete $scope.doc._id;
        delete $scope.doc.__v;
        $scope.definition = JSON.parse($scope.definition);
        SISClient.schemas.update($scope.doc,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            notify('This schema has been successfully updated.');
            $location.path('/');
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
        SISClient.schemas.create($scope.doc,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            notify('This schema has been successfully created.');
            $location.path('/');
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
        SISClient.schemas.delete({'name' : $scope.schema },function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            notify('This schema has been successfully removed.');
            $location.path('/');
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
        SISClient.schemas.get($scope.schema, function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            $scope.$apply(function() {
                $scope.defkeys = [];
                for(var k in data.definition) {
                  $scope.defkeys.push(k);
                }
            });
            SISClient.entities($scope.schema).list(function(err,data) {
                if(err) {
                    alert_out(err);
                    return;
                }
                $scope.$apply(function() {
                    $scope.docs = data;
                    $scope.record_count = data.length;
                });
            });
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
        SISClient.schemas.get($scope.schema, function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            $scope.$apply(function() {
                $scope.defkeys = [];
                for(var k in data.definition) {
                  $scope.defkeys.push(k);
                }
            });

            SISClient.entities($scope.schema).get($scope.id,function(err,data) {
                if(err) {
                    alert_out(err);
                    return;
                }
                $scope.$apply(function() {
                    $scope.doc = data;
                });
            });
        });
    };
    $scope.save = function() {
        delete $scope.doc.__v;
        SISClient.entities($scope.schema).update($scope.doc,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            notify('This entity has been successfully updated.');
            $location.path('/list/'+$scope.schema);
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
        SISClient.schemas.get($scope.schema,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            $scope.$apply(function() {
                $scope.defkeys = [];
                $scope.doc = {};
                for(var k in data.definition) {
                  $scope.defkeys.push(k);
                  $scope.doc[k] = '';
                }
            });
        });
    };
    $scope.create = function() {
        SISClient.entities($scope.schema).create($scope.doc,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }

            notify('This entity has been successfully created.');
            $location.path('/list/'+$scope.schema);
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
        SISClient.entities($scope.schema).delete({'_id':$scope.id},function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            notify('Entity has been successfully removed.');
            $location.path('/list/'+$scope.schema);
        });
    }
    $scope.back = function() {
        window.history.back();
    }
}

function HookListCtrl($scope,$http) {
    $scope.record_count = 0;
    $scope.refresh = function() {
        SISClient.hooks.list(function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            $scope.$apply(function() {
                $scope.hooks = data;
                $scope.record_count = data.length;
            });
        });
    };
    $scope.refresh();
}

function HookEditCtrl($scope,$http,$routeParams) {
    $scope.hook = $routeParams.hook;
    $scope.events = {};
    $scope.onload = function() {
        SISClient.hooks.get($scope.hook,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            $scope.$apply(function() {
                $scope.doc = data;
                $scope.events.insert = false;
                $scope.events.update = false;
                $scope.events.delete = false;
                for (var i = 0; i < $scope.doc.events.length; i++) {
                    $scope.events[$scope.doc.events[i]] = true;
                }
            });
        });
    }
    $scope.save = function() {
        delete $scope.doc._id;
        delete $scope.doc.__v;
        $scope.doc.events = [];
        if($scope.events.insert) $scope.doc.events.push('insert');
        if($scope.events.update) $scope.doc.events.push('update');
        if($scope.events.delete) $scope.doc.events.push('delete');
        SISClient.hooks.update($scope.doc,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            notify('This hook has been successfully updated.');
            $location.path('/');
        });
    }
    $scope.back = function() {
        window.history.back();
    }
    $scope.onload();
    
}
function HookCreateCtrl($scope,$http,$location) {

    // Grab existing data, and pop open a modal with a form
    // ----------------------------------------------------
    $scope.onload = function() {
        $scope.events.insert = false;
        $scope.events.update = false;
        $scope.events.delete = false;
        $scope.doc = {
            "name" : '',
            "owner" : '',
            "entity_type" : '',
            "target" : {
                "action" : '',
                "url" : ''
            },
            "events" : [],
        };
    };
    $scope.create = function() {
        if($scope.events.insert) $scope.doc.events.push('insert');
        if($scope.events.update) $scope.doc.events.push('update');
        if($scope.events.delete) $scope.doc.events.push('delete');
        SISClient.hooks.create($scope.doc,function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            notify('This hook has been successfully created.');
            $location.path('/');
        });
    }
    $scope.back = function() {
        window.history.back();
    }
    $scope.onload();
}
function HookRemoveCtrl($scope,$http,$routeParams,$location) {
    $scope.hook = $routeParams.hook;

    $scope.remove_hook = function() {
        SISClient.hooks.delete({'name' : $scope.hook },function(err,data) {
            if(err) {
                alert_out(err);
                return;
            }
            notify('This hook has been successfully removed.');
            $location.path('/');
        });
    }
    $scope.back = function() {
        window.history.back();
    }
}
