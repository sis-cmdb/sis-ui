// Runtime configuration, read before the app starts. Deployments supply
// app/js/config.js, in either format:
//
//   window.SIS_CONFIG = { API_URL: "https://sis.example.com" };
//
// or the format of the AngularJS UI's config.js, which keeps working unchanged:
//
//   angular.module('sisconfig', []).constant("API_URL", "https://sis.example.com");
//
// Without an API_URL the UI talks to the server it was loaded from.
(function() {
    "use strict";
    var config = window.SIS_CONFIG = window.SIS_CONFIG || {};
    var module = {
        constant: function(name, value) {
            config[name] = value;
            return module;
        }
    };
    window.angular = window.angular || {
        module: function() {
            return module;
        }
    };
})();
