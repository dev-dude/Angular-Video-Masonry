'use strict';

angular.module('youtube2App')
.directive('clickToLaunch', function() {
    return {
        restrict: 'AC',
        require: '^masonry',
        scope: {
            transfer: '='
        },
        link: function (scope) {
            scope.transfer.resizeIt = function() {
                console.log('element');
            };
        }
    };
});
