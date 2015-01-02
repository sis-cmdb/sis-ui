angular.module('sisui')
.service('EndpointPager', function() {

    // Pager class
    function EndpointPager(endpoint, scope, opts) {

        var convertParsedToQueryObj = function(parsed) {
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
        };

        this.parseSearch = function(search) {
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
        };

        var self = this;
        // init
        scope.totalItems = 0;
        scope.currentPage = 1;
        // opts/defaults
        opts = opts || { };
        scope.pageSize = opts.pageSize || 20;
        var sortField = opts.sortField || null;
        var fields = opts.fields || null;
        var searchQuery = this.parseSearch(opts.search);
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
            endpoint.list(query).then(function(items) {
                scope.totalItems = items.total_count;
                scope[itemsField] = items.results;
            });
        };

        // attach some scope methods
        this.setPage = function(pageNum) {
            scope.currentPage = pageNum;
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
                self.loadPage();
            }
        });
        scope.setPage = this.setPage.bind(this);

        // add the filter method
        scope.filter = function(text) {
            if (!text) {
                self.setSearch(text);
                return;
            }
            var parsed = self.parseSearch(text);
            if (!parsed) {
                scope.filterError = "invalid query";
            } else {
                scope.filterError = null;
                self.setSearch(parsed);
            }
        };
    }

    return {
        create : function(endpoint, scope, opts) {
            return new EndpointPager(endpoint, scope, opts);
        }
    };

});
