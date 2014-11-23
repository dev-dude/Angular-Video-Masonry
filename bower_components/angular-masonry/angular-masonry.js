/*!
 * angular-masonry 0.8.1
 * Pascal Hartig, weluse GmbH, http://weluse.de/
 * License: MIT
 */
(function () {
    'use strict';
    angular.module('wu.masonry', []).controller('MasonryCtrl', [
        '$scope',
        '$element',
        '$timeout',
        '$rootScope',
        function controller($scope, $element, $timeout, $rootScope) {
            var bricks = {};
            var schedule = [];
            var destroyed = false;
            var self = this;
            var timeout = null;
            this.preserveOrder = false;
            this.loadImages = true;
            this.scheduleMasonryOnce = function scheduleMasonryOnce() {
                var args = arguments;
                var found = schedule.filter(function filterFn(item) {
                    return item[0] === args[0];
                }).length > 0;
                if (!found) {
                    this.scheduleMasonry.apply(null, arguments);
                }
            };
            // Make sure it's only executed once within a reasonable time-frame in
            // case multiple elements are removed or added at once.
            this.scheduleMasonry = function scheduleMasonry() {
                if (timeout) {
                    $timeout.cancel(timeout);
                }
                schedule.push([].slice.call(arguments));
                timeout = $timeout(function runMasonry() {
                    if (destroyed) {
                        return;
                    }
                    schedule.forEach(function scheduleForEach(args) {
                        $element.masonry.apply($element, args);
                    });
                    schedule = [];
                }, 30);
            };
            function defaultLoaded($element) {
                $element.addClass('loaded');
            }

            this.appendBrick = function appendBrick(element, id) {
                if (destroyed) {
                    return;
                }
                function _append() {
                    if (Object.keys(bricks).length === 0) {
                        $element.masonry('resize');
                    }
                    if (bricks[id] === undefined) {
                        // Keep track of added elements.
                        bricks[id] = true;
                        defaultLoaded(element);
                        $element.masonry('appended', element, true);
                    }
                }

                function _layout() {
                    // I wanted to make this dynamic but ran into huuuge memory leaks
                    // that I couldn't fix. If you know how to dynamically add a
                    // callback so one could say <masonry loaded="callback($element)">
                    // please submit a pull request!
                    self.scheduleMasonryOnce('layout');
                }

                if (!self.loadImages) {
                    _append();
                    _layout();
                } else if (self.preserveOrder) {
                    _append();
                    element.imagesLoaded(_layout);
                } else {
                    element.imagesLoaded(function imagesLoaded() {
                    $rootScope.counter++;


                        _append();

                        if ( $rootScope.counter === 1 &&  $rootScope.counter < 3) {
                            console.log('fired');
                            _layout();
                        } else {
                            $rootScope.waitForFinalEvent(function() {
                                _layout();
                            }, 10, 'ssdsdss');
                        }
                    });
                }
            };
            this.removeBrick = function removeBrick(id, element) {
                if (destroyed) {
                    return;
                }
                delete bricks[id];
                $element.masonry('remove', element);
                this.scheduleMasonryOnce('layout');
            };
            this.destroy = function destroy() {
                destroyed = true;
                if ($element.data('masonry')) {
                    // Gently uninitialize if still present
                    $element.masonry('destroy');
                }
                $scope.$emit('masonry.destroyed');
                bricks = [];
            };
            this.reload = function reload() {
                $element.masonry();
                $scope.$emit('masonry.reloaded');
            };





        }
    ]).directive('masonry', ['$rootScope', function ($rootScope) {
        return {
            restrict: 'AE',
            controller: 'MasonryCtrl',
            link: {
                pre: function preLink(scope, element, attrs, ctrl) {
                    var attrOptions = scope.$eval(attrs.masonry || attrs.masonryOptions);
                    var isFirefox = typeof InstallTrigger !== 'undefined';
                    var isIE = false || !!document.documentMode;
                    var has3d = function() {
                        return ('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix());
                    };

                    var configObj = {
                        itemSelector: attrs.itemSelector || '.masonry-brick',
                        columnWidth: parseInt(attrs.columnWidth, 10) || attrs.columnWidth
                    };

                    if (isFirefox || isIE || !has3d) {
                        configObj.transitionDuration = 0;
                    }

                    var options = angular.extend(configObj,
                            attrOptions || {});
                    element.masonry(options);
                    var loadImages = scope.$eval(attrs.loadImages);
                    ctrl.loadImages = loadImages !== false;
                    var preserveOrder = scope.$eval(attrs.preserveOrder);
                    ctrl.preserveOrder = preserveOrder !== false && attrs.preserveOrder !== undefined;
                    scope.$emit('masonry.created', element);
                    scope.$on('$destroy', ctrl.destroy);
                    scope.executed = true;
                    element.masonry( 'on', 'layoutComplete', function( msnryInstance, laidOutItems ) {
                        if (laidOutItems.length > 2) {
                            $rootScope.waitForFinalEvent(function() {
                                var playerElWidth = document.getElementById('player').offsetWidth;
                                if (playerElWidth > 305 && playerElWidth !== 1) {
                                    scope.$emit('masonry.reposition', {'speedUp': true});
                                }
                            }, 10, 'ks2j1kc');
                        }
                    });

                    scope.rePositionPlayer = function(speedUp) {
                        var  timer = 1000;
                        if (speedUp) {
                            timer = 100;
                        }
                        $rootScope.waitForFinalEvent(function(){
                            scope.player = angular.element(document.getElementById('player'));
                            if (angular.isDefined($rootScope.elementSaved)) {
                                var top = $rootScope.elementSaved[0].style.top.replace('px', ''),
                                    left = $rootScope.elementSaved[0].style.left.replace('px', '');
                                if ($rootScope.bigThumbSize) {
                                    scope.player.css({width: '724px', height: '385px', position: 'absolute', 'border': 'none'});
                                } else {
                                    scope.player.css({width: '632px', height: '385px', position: 'absolute', 'border': 'none'});
                                }
                                scope.player.css({left: (parseInt(left) +
                                    41) + 'px', top: (parseInt(top) + 354) + 'px', 'zIndex': 1000000});
                            }
                        }, timer, 'x12123');
                    };

                    $rootScope.$on('masonry.reposition', function (event, message) {
                        if (angular.isDefined(message) &&  message.hasOwnProperty('speedUp')){
                            scope.rePositionPlayer(true);
                        } else {
                            scope.rePositionPlayer();
                        }

                    });

                    scope.reload = function (reposition) {
                        $rootScope.waitForFinalEvent(function () {
                            ctrl.scheduleMasonryOnce('reloadItems');
                            if (reposition) {
                                ctrl.scheduleMasonryOnce('layout');
                            }
                        }, 1000, 'x12123xxxx220');
                    };

                    scope.$on('masonry.reload', function (event, dontReposition) {
                        scope.reload(dontReposition);
                    });

                }
            }
        };
    }]).directive('masonryBrick', ['$window', '$rootScope', function ($window, $rootScope) {
        return {
            restrict: 'AC',
            require: '^masonry',
            scope: {
                videoId: '=',
                rating: '='
            },
            link: {
                pre: function preLink(scope, element, attrs, ctrl) {

                    var id = scope.$id, index;
                    scope.stars = function(rating) {
                        var roundedRating = Math.round(rating * 10) / 10,
                            i = 1,
                            star = 'fa-star',
                            fullString = '';
                        for (; i <= 5; i++) {
                            if (roundedRating === i) {

                            } else if (roundedRating > i - 0.5 && roundedRating < i) {
                                star = 'fa-star-half';
                            } else if (roundedRating >= i) {
                                star = 'fa-star';
                            } else {
                                star = '';
                            }
                            fullString += '<i class=\'fa ' + star + '\'></i>';
                        }
                        return fullString;
                    };



                    ctrl.appendBrick(element, id);
                    element.find('.rating').append(scope.stars(scope.rating));
                    element.on('$destroy', function () {
                        ctrl.removeBrick(id, element);
                    });



                    scope.$watch('$index', function () {
                        if (index !== undefined && index !== scope.$index) {
                            ctrl.scheduleMasonryOnce('reloadItems');
                            ctrl.scheduleMasonryOnce('layout');
                        }
                        index = scope.$index;
                    });
                },
                post: function postLink(scope, element, attrs, ctrl) {

                    function openVideo() {
                        $rootScope.elementSaved = element;
                        $rootScope.$broadcast('closeMainBox');
                        scope.$parent.showShare = true;
                        scope.$parent.showInformation = true;
                        // scope.player.css({width: '1px', height: '1px'});
                        //window.player.loadVideoById(scope.videoId);
                        if (angular.isDefined($window.lastElement)) {
                            $window.lastElement.find('.video-area').addClass('hide');
                            $window.lastElement.find('.img-area').removeClass('hide');
                            $window.lastElement.find('.shareBtn').addClass('hide');
                            $window.lastElement.find('.playBtn').removeClass('hide');
                            $window.lastElement.removeClass('open');
                            $window.lastElement.find('.information').addClass('hide');
                        }



                        $window.lastElement = element;
                        element.addClass('open');
                        element.find('.img-area').addClass('hide');
                        element.find('.shareBtn').removeClass('hide');
                        element.find('.playBtn').addClass('hide');
                        element.find('.video-area').removeClass('hide');
                        element.find('.information').removeClass('hide');
                        $rootScope.waitForFinalEvent(function() {
                            scope.$emit('videoPlayed', {videoId: scope.videoId});
                        }, 500, 'blahblah2');
                    }


                    element.find('.img-area').on('click', function () {
                        openVideo();
                    });

                    element.find('.playBtn').on('click', function () {
                        openVideo();
                    });

                    $rootScope.crappyRanOnce = true;
                    $rootScope.$on('calcRatingMain', function(event, rating) {
                        if ($rootScope.crappyRanOnce) {
                            $rootScope.crappyRanOnce = false;
                            var ratingElOnMain = angular.element(document.getElementsByClassName('main-video'));
                            ratingElOnMain.find('.rating').append(scope.stars(rating));
                        }
                    });


                }
            }
        };
    }]);
}());
