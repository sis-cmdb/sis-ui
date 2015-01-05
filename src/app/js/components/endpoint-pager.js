angular.module('sisui')
.service('EndpointPager', function(SisQueryParser, $location) {

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


    // Pager class
    function EndpointPager(endpoint, scope, opts) {
        this.parseSearch = function(search) {
            return parseSearch(search);
        };

        var self = this;
        // init
        // opts/defaults
        opts = opts || { };
        scope.pageSize = opts.pageSize || 20;
        var sortField = opts.sortField || null;
        var fields = opts.fields || null;
        var searchQuery = parseSearch(opts.search);
        var itemsField = opts.itemsField || 'items';
        var idField = opts.idField || 'name';

        this.endpoint = endpoint;

        this.setSearch = function(search) {
            searchQuery = this.parseSearch(search);
            if (searchQuery) {
                // set page to 1
                this.setPage(1);
            }
            this.loadPage();
        };

        this.setSort = function(sort) {
            sortField = sort;
            this.loadPage();
        };

        this.loadPage = function() {
            var query = {
                limit : scope.pageSize,
                offset: (scope.currentPage - 1) * scope.pageSize
            };
            if (sortField) {
                query.sort = sortField;
            }
            if (fields) {
                query.fields = fields;
            }
            if (searchQuery) {
                query.q = searchQuery;
            }
            // console.log("LP: " + JSON.stringify($location.search()));
            // console.log("LPQ: " + JSON.stringify(query));
            // console.log(new Error().stack);
            endpoint.list(query).then(function(items) {
                // console.log("CB: " + JSON.stringify($location.search()));
                scope.totalItems = items.total_count;
                scope.itemsPerPage = 20;
                scope[itemsField] = items.results;
            });
        };

        // attach some scope methods
        this.setPage = function(pageNum) {
            console.log("Set page " + pageNum);
            scope.currentPage = pageNum;
            if (!opts.ignoreLoc) {
                $location.search('p', pageNum);
            }
            self.loadPage();
        };

        this.remove = function(item) {
            var d = $q.defer();
            endpoint.delete(item).then(function(res) {
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

        scope.$watch('currentPage', function(newVal, oldVal) {
            if (newVal != oldVal || !scope[itemsField]) {
                console.log("Watch calling.. ");
                self.setPage(newVal);
            }
        });
        scope.setPage = this.setPage.bind(this);

        // add the filter method
        scope.filter = function(text) {
            if (!text) {
                self.setSearch(text);
                if (!opts.ignoreLoc) {
                    $location.search('q', null);
                }
                return;
            }
            if (!opts.ignoreLoc) {
                $location.search('q', text);
            }
            var parsed = self.parseSearch(text);
            if (!parsed) {
                scope.filterError = "invalid query";
                if (!opts.ignoreLoc) {
                    $location.search('q', null);
                }
            } else {
                scope.filterError = null;
                self.setSearch(parsed);
            }
        };

        this.load = function(page, filterText) {
            $location.search('p', page);
            $location.search('q', filterText);
            searchQuery = this.parseSearch(filterText);
            scope.filterText = filterText;
            console.log("Load ");
            this.setPage(page);
        };

        function loadFromLocation(forced) {
            var search = $location.search();
            var q = search.q || "";
            var p = parseInt(search.p, 10);
            var changed = false;
            if (isNaN(p)) {
                p = 1;
            }
            if (p != scope.currentPage) {
                changed = true;
            }
            if (q != scope.filterText) {
                changed = true;
            }
            if (changed || forced) {
                self.load(p, q);
            }
        }

        if (!opts.ignoreLoc) {
            // set the page and filter if available
            scope.$on('$locationChangeSuccess', function() {
                loadFromLocation(false);
            });
            loadFromLocation(true);
        } else {
            self.setPage(1);
        }
    }

    function SmartTableSetup(endpoint, scope, opts) {
        // init
        // opts/defaults
        opts = opts || { };
        scope.pageSize = opts.pageSize || 20;
        var sortField = opts.sortField || null;
        var fields = opts.fields || null;
        var searchQuery = parseSearch(opts.search);
        var itemsField = opts.itemsField || 'items';
        var idField = opts.idField || 'name';

        var loading = false;

        this.loadFromState = function(tableState) {
            var query = {
                limit : tableState.pagination.number,
                offset: tableState.pagination.start,
            };
            if (sortField) {
                query.sort = sortField;
            }
            if (fields) {
                query.fields = fields;
            }
            if (searchQuery) {
                query.q = searchQuery;
            }
            // console.log("LP: " + JSON.stringify($location.search()));
            // console.log("LPQ: " + JSON.stringify(query));
            // console.log(new Error().stack);
            endpoint.list(query).then(function(items) {
                var numPages = Math.ceil(items.total_count / 20);
                // console.log("CB: " + JSON.stringify($location.search()));
                tableState.pagination.numberOfPages = numPages;
                scope.itemsPerPage = 20;
                scope[itemsField] = items.results;
            });
        };

        if (scope.stController) {
            this.loadFromState(scope.stController.tableState());
        }

    }


    return {
        create : function(endpoint, scope, opts) {
            return new EndpointPager(endpoint, scope, opts);
        },
        createStPager : function(endpoint, scope, opts) {
            return new SmartTableSetup(endpoint, scope, opts);
        }
    };

});
