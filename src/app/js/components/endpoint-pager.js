angular.module('sisui')
.service('EndpointPager', function(SisQueryParser, $location, $q) {

    function convertParsedToQueryObj(parsed) {
        var left = parsed[0];
        var right = parsed[2];
        var op = parsed[1].toLowerCase();
        var result = { };
        if (left instanceof Array ||
            right instanceof Array) {
            // op is or/and
            left = convertParsedToQueryObj(left);
            right = convertParsedToQueryObj(right);
            op = '$' + op;
            result[op] = [left, right];
        } else {
            // at a leaf
            if (!isNaN(right)) {
                right = parseFloat(right);
            }
            var opMap = {
                ">=" : "$gte",
                "<=" : "$lte",
                "<" : "$lt",
                ">" : "$gt",
                "!=" : "$ne"
            };
            if (op in opMap) {
                // { field : { op : val }}
                var rightOp = {}; rightOp[opMap[op]] = right;
                result[left] = rightOp;
            } else if (op == "nin" || op == "in") {
                right = right.split(",").map(function(s) {
                    s = s.trim();
                    if (!isNaN(s)) {
                        s = parseFloat(s);
                    }
                    return s;
                });
            } else if (op == "like") {
                result[left] = { $regex : right, $options : "i" };
            } else {
                // equal
                result[left] = right;
            }
        }
        return result;
    }

    function parseSearch(search) {
        if (!search) {
            return null;
        }
        if (typeof search === 'object') {
            return search;
        }
        try {
            var parsed = SisQueryParser.parse(search);
            return convertParsedToQueryObj(parsed);
        } catch (ex) {
            return null;
        }
        return null;
    }

    function SmartTableSetup(scope, opts) {
        // init
        // opts/defaults
        opts = opts || { };
        var pageSize = opts.pageSize || 20;
        var fields = opts.fields || null;
        var itemsField = opts.itemsField || 'items';
        var idField = opts.idField || 'name';
        var searchText = "";
        var parsedSearch = null;

        this.stController = null;
        this.endpoint = null;
        var self = this;

        var loading = false;

        // called from the parent scope to do page
        // loads
        this.loadPage = function(state, controller) {
            if (!this.stController) {
                this._setStController(controller);
            } else {
                // table state change triggered
                // after initialization
                // ensure the page is set
                var page = state.pagination.start / pageSize;
                page++;
                this._changeLocation('p', page);
                this._loadFromState(state);
            }
        };

        this.remove = function(item) {
            var d = $q.defer();
            this.endpoint.delete(item).then(function(res) {
                var items = scope[itemsField];
                var itemId = item[idField];
                for (var i = 0; i < items.length; ++i) {
                    if (items[i][idField] == itemId) {
                        items.splice(i, 1);
                        break;
                    }
                }
                d.resolve(res);
            }, function(err) {
                d.reject(err);
            });
            return d.promise;
        };

        this.setEndpoint = function(endpoint, sort) {
            if (this.endpoint) {
                return;
            }
            this.endpoint = endpoint;
            opts.sortField = sort ? sort : opts.sortField;
            this._init();
        };

        // private api
        this._setStController = function(controller) {
            if (this.stController) {
                // already set
                return;
            }
            this.stController = controller;
            this._init();
        };

        this._attachToScope = function() {
            // when called, resets page number to 1
            // and issues a query
            scope.filter = function(text) {
                var resetPage = false;
                scope.filterError = "";
                if (!text && parsedSearch) {
                    // turn off the query
                    parsedSearch = null;
                    searchText = null;
                    self._changeLocation('q', null);
                    resetPage = true;
                } else if (text) {
                    var parsed = parseSearch(text);
                    if (!parsed) {
                        scope.filterError = "Invalid query.";
                        return;
                    }
                    searchText = text;
                    parsedSearch = parsed;
                    self._changeLocation('q', text);
                    resetPage = true;
                }
                if (resetPage) {
                    var state = self.stController.tableState();
                    state.pagination.start = 0;
                    self._changeLocation('p', 1);
                    self._loadFromState(state);
                }
            };

            if (opts.ignoreLoc) {
                // done
                return;
            }
            // watch for location changes
            scope.$on("$locationChangeSuccess", function() {
                // load from location
                var controllerState = self.stController.tableState();
                var search = $location.search();
                // update state
                var page = parseInt(search.p, 10);
                if (isNaN(page) || page < 0) {
                    page = 1;
                }
                var q = search.q || "";
                var pageStart = (page - 1) * pageSize;
                var changed = false;
                if (controllerState.pagination.start !== pageStart ||
                    q !== searchText) {
                    changed = true;
                    controllerState.pagination.start = pageStart;
                    searchText = q;
                    parsedSearch = parseSearch(q);
                    scope.filterText = q;
                }
                if (changed) {
                    self._loadFromState(controllerState);
                }
            });
        };


        this._changeLocation = function(key, val) {
            if (!opts.ignoreLoc) {
                $location.search(key, val);
            }
        };

        this._init = function() {
            if (!this.endpoint || !this.stController) {
                return;
            }
            // figure out initial state to load
            var controllerState = this.stController.tableState();
            if (!opts.ignoreLoc) {
                var search = $location.search();
                // update state
                var page = parseInt(search.p, 10);
                if (isNaN(page)) {
                    page = 1;
                }
                controllerState.pagination.start = (page - 1) * pageSize;
                controllerState.pagination.number = pageSize;
                var q = search.q || "";
                if (q) {
                    searchText = q;
                    parsedSearch = parseSearch(searchText);
                    // update scope
                    scope.filterText = searchText;
                }
            }
            // setup scope
            this._attachToScope();
            // load initial state
            this._loadFromState(controllerState);
        };

        this._loadFromState = function(tableState) {
            var query = {
                limit : tableState.pagination.number,
                offset: tableState.pagination.start,
            };
            if (opts.sortField) {
                query.sort = opts.sortField;
            }
            if (fields) {
                query.fields = fields;
            }
            if (parsedSearch) {
                query.q = parsedSearch;
            }

            this.endpoint.list(query).then(function(items) {
                var numPages = Math.ceil(items.total_count / pageSize);
                // console.log("CB: " + JSON.stringify($location.search()));
                tableState.pagination.numberOfPages = numPages;
                scope[itemsField] = items.results;
            });
        };
    }


    return {
        create : function(endpoint, scope, opts) {
            return new EndpointPager(endpoint, scope, opts);
        },
        createStPager : function(scope, opts) {
            return new SmartTableSetup(scope, opts);
        }
    };

});
