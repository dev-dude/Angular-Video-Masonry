'use strict';

angular
  .module('youtube2App', [
    'ngCookies',
    'ngStorage',
    'ngResource',
    'ngSanitize',
    'btford.socket-io',
    'ngRoute',
    'wu.masonry',
    'djds4rce.angular-socialshare',
    'mgcrea.jquery'//,
   // 'angulartics',
   // 'angulartics.segment.io'
])
  .config(function ($routeProvider) {
    var windowLocation = window.location.hostname,
       fullUrl = 'http://' + windowLocation + '/app/views/layouts/default/views/main.html';


    // Change this to true to run locally vs on a server
    if (true) {
        fullUrl ='http://' + windowLocation + ':9000/views/main.html';
        window.currentIp = '127.0.0.1';
    }

   // alert('http://' + windowLocation + '/app/views/layouts/default/views/main.html');
    $routeProvider
      .when('/', {
        templateUrl: fullUrl,
        controller: 'MainCtrl'
    }).when('/video/:videoId', {
        templateUrl: fullUrl,
        controller: 'MainCtrl'
    }).when('/video/:videoId/:title', {
        templateUrl: fullUrl,
        controller: 'MainCtrl'
    }).when('/search/:searchTerm', {
            templateUrl: fullUrl,
            controller: 'MainCtrl'
        })
      .otherwise({
            redirectTo: 'http://' + windowLocation + '/'
        });
}).run(function($FB,$location,$rootScope,$route){
    // Insert FaceBook ID here
    $FB.init('324384384384');

    var original = $location.path;
    $location.path = function (path, reload) {
        if (reload === false) {
            var lastRoute = $route.current;
            var un = $rootScope.$on('$locationChangeSuccess', function () {
                $route.current = lastRoute;
                un();
            });
        }
        return original.apply($location, [path]);
    };
});
