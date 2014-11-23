'use strict';

angular.module('youtube2App')
    .controller(
    'MainCtrl', [
        '$scope',
        'YoutubeService',
        '$log',
        '$window',
        '$routeParams',
        '$rootScope',
        '$location',
        '$localStorage',
        '$filter',
        'uSocket',
        //'$analytics',
        /* global jQuery */
        function ($scope, YoutubeService, $log, $window, $routeParams, $rootScope, $location, $localStorage, $filter, uSocket /*, $analytics*/) {
            //  TODO: shouldn't be here I know
            //  TODO: IM LAZY I KNOW
            $scope.showLoading = true;
            $scope.showLoadingFancy = true;
            $scope.ranPlayerReady = true;
            $scope.playerEl2 = angular.element(document.getElementById('player'));
            $scope.searchType = YoutubeService.youtubeObj.searchType;
            $scope.thumbSize = 'mqdefault';
            $scope.videos = [];
            $rootScope.bigThumbSize = true;
            $scope.currentLoadedPercentage = 0;
            $scope.videoStash = [];
            $scope.searchTerm = '';
            $scope.initialLoad = true;
            $scope.reArranged = false;
            $scope.undefinedCounter = 0;
            $scope.intervalOne;
            $scope.intervalTwo;
            $scope.countryCode = 'US';
            $scope.menuClosedOnce = false;
            $scope.menuClosed = false;
            $rootScope.currentSocketId = '';
            $scope.countStartup = false;
            $scope.chatTextSend = '';
            $scope.chatText = '';
            $scope.showBackDropSpecial = false;


            $rootScope.counter = 0;
            $rootScope.totalVideos = 0;


            // Get stash from local storage
            if ($localStorage.hasOwnProperty('greatVideoStash')) {
                $scope.videoStash = $localStorage.greatVideoStash;
            }

            $rootScope.waitForFinalEvent = (function () {
                var timers = {};
                return function (callback, ms, uniqueId) {
                    if (!uniqueId) {
                        uniqueId = 'Don\'t call this twice without a uniqueId';
                    }
                    if (timers[uniqueId]) {
                        clearTimeout(timers[uniqueId]);
                    }
                    timers[uniqueId] = setTimeout(callback, ms);
                };
            })();

            function showSmallWindow() {
                if ($scope.playerReady) {
                    var top = '105';
                    if ($scope.menuClosed) {
                        top = '55';
                    }
                    document.getElementById('player').setAttribute(
                        'style', 'height: 190px; width: 300px; position: fixed; left: initial;' +
                            'right: 0px; top: '+top+'px;border: 1px solid rgb(172, 172, 172); ' +
                            'box-shadow: 1px 1px 10px rgb(172, 172, 172);');
                }
            }

            function closeMenu() {
                if (!$scope.menuClosedOnce) {
                    setTimeout(function () {
                        var $headerEl = angular.element(document.getElementsByClassName('header')[0]),
                            $currentEl = angular.element(document.getElementsByClassName('expand-menu')[0]);
                        $headerEl.addClass('slide-height');
                        $currentEl.removeClass('fa-angle-up').addClass('fa-angle-down');
                        $headerEl.addClass('slide-height');
                        $currentEl.addClass('closed');
                        setTimeout(function () {
                            $headerEl.addClass('menu-closed');
                        }, 100);
                    }, 2000);
                    $scope.menuClosed = true;
                    $scope.menuClosedOnce = true;
                }
            }

            $rootScope.$watch('counter', function (value) {
                // $log.error(value);
                // $log.error($rootScope.totalVideos);

                if (value > 0 && $rootScope.totalVideos > 0) {
                    $scope.currentLoadedPercentage = (value / $rootScope.totalVideos) * 100;
                }
                if (value > 0 && value >= $rootScope.totalVideos) {
                    $rootScope.waitForFinalEvent(function () {
                        var playerWidth = document.getElementById('player').offsetWidth;
                        // if (Math.floor((Math.random() * 3) + 1) === 3) {
                        if ($scope.reArranged) {
                            if (playerWidth > 305 && playerWidth !== 1) {
                                $scope.$broadcast('masonry.reload');
                            }
                        } else {
                            $scope.reArranged = true;
                            if (playerWidth > 305 && playerWidth !== 1) {
                                $scope.$broadcast('masonry.reload', {'reposition': true});
                            }
                        }
                        $rootScope.waitForFinalEvent(function () {
                            $scope.playerEl2 = angular.element(document.getElementById('player'));
                            $scope.playerEl2.removeClass('animateBrick');
                            $scope.markVideosAsInStash();
                        }, 2000);
                        // If it's not the small player then reposition

                        if (playerWidth > 305 && playerWidth !== 1) {
                            $scope.$emit('masonry.reposition', {'speedUp':true});
                        }
                        // }

                    }, 10, '123x3333vv');
                    jQuery('.progress').addClass('shrink');
                    closeMenu();
                    $rootScope.counter = 0;
                    $rootScope.totalVideos = 0;

                }

                if ($rootScope.totalVideos > 60) {
                    $rootScope.totalVideos = 0;
                }
            });


            jQuery(document).ready(function () {
                jQuery('#youtubeSearch').autocomplete({
                    appendTo: '#autocompleteEl',
                    source: function (request, response) {
                        var apiKey = 'AI39si7ZLU83bKtKd4MrdzqcjTVI3DK9FvwJR6a4kB_SW_Dbuskit-mEYqskkSsFLxN5DiG1OBzdHzYfW0zXWjxirQKyxJfdkg';
                        var query = request.term;
                        jQuery.ajax({
                            url: 'http://suggestqueries.google.com/complete/search?hl=en&ds=yt&client=youtube&hjson=t&cp=1&q=' + query + '&key=' + apiKey + '&format=5&alt=json&callback=?',
                            dataType: 'jsonp',
                            success: function (data) {

                                response(jQuery.map(data[1], function (item) {
                                    return {
                                        label: item[0],
                                        value: item[0]
                                    };
                                }));
                            }
                        });
                    },
                    select: function (event, ui) {
                        $scope.searchTerm = ui.item.value;
                        jQuery('.ui-autocomplete').hide();
                    }
                });
                jQuery('html, body').animate({ scrollTop: 0 }, 'slow');
            });


            $scope.excludeSameVideos = function (newVideos) {

                var storedVideoIds = [],
                    filteredVideos = [];
                for (var i in $scope.videos) {
                    if (angular.isDefined($scope.videos[i])) {
                        storedVideoIds.push($scope.videos[i].id);
                    }
                }

                for (var x in newVideos) {
                    if (storedVideoIds.indexOf(newVideos[x].id) === -1 && angular.isDefined(newVideos[x].id)) {
                        filteredVideos.push(newVideos[x]);
                    }
                }
                return filteredVideos;
            };

            $scope.hideBackDropSpecial = function() {
                $scope.showBackDropSpecial = false;
            };

            $scope.closeMainBox = function (doNotCloseMainBox) {
                $scope.hideBackDropSpecial();
                if ($scope.videosBack && $rootScope.joinedRoom) {
                    $scope.videos = $scope.videosBack;
                    $scope.videosBack = undefined;
                    $rootScope.$emit('leaveRoom');
                }

                if ($rootScope.joinedRoom === $rootScope.currentSocketId && $rootScope.joinedRoom !== '') {
                    $rootScope.showChatArea1 = true;
                }

                var playerWidth = document.getElementById('player').offsetWidth,
                box = angular.element(document.getElementsByClassName('main-video'));
                if (playerWidth > 305 && playerWidth !== 1) {
                    box.hide();
                    if ($window.hasOwnProperty('player') && $window.player.hasOwnProperty('stopVideo') && !angular.isDefined(doNotCloseMainBox)) {
                        // Basically if on the homepage dont run search
                        if (window.location.href.indexOf('#/video') !== -1 || window.location.href.indexOf('.html') !== -1 || window.location.href.indexOf('search') !== -1) {
                            $window.player.stopVideo();
                        } else {
                            // Clear Everything because going back to homepage.
                            YoutubeService.clearEverythingNewSearch();
                            $scope.lastVideoId = undefined;
                            YoutubeService.youtubeObj.lastVideoSearch = 'regionSearchNotAUserSearch__' + $scope.countryCode;
                            delete $rootScope.elementSaved;
                            if (window.player.hasOwnProperty('stopVideo')) {
                                $window.player.stopVideo();
                            } else {
                                $window.onYouTubeIframeAPIReady();
                            }

                        }
                    }

                    document.getElementById('player').style.height = '1px';
                    document.getElementById('player').style.width = '1px';
                    // $analytics.eventTrack('closeMainBox');
                }
                if (jQuery('.main-video').is(':visible')){
                    box.hide();
                }
            };

            $scope.intervalOne = setInterval(function() {
                jQuery('.down-arrow').addClass('up-and-down');
            },2000);

            $scope.intervalTwo = setInterval(function() {
                jQuery('.down-arrow').removeClass('up-and-down');
            },3000);

            setTimeout(function(){
                clearInterval($scope.intervalOne);
                clearInterval($scope.intervalTwo);
                jQuery('.down-arrow').hide();
            },25000);

            $scope.scriptNotAdded = true;
            function loadPlayer(videoId, data) {
                $rootScope.singleVideoDataId = videoId;

                var sendData = {};
                if ($routeParams.hasOwnProperty('title') && !angular.isDefined(data)) {
                    sendData.title = decodeURIComponent($routeParams.title.replace('.html',''));
                } else if (angular.isDefined(data) && data.hasOwnProperty('title')) {
                    sendData.title = data.title;
                }

                // Socket Data Should Abstract but don't want too

                $rootScope.$emit('socket-videoPlayed', {data: sendData, videoId: videoId});
                var title = '';
                if ($scope.scriptNotAdded) {
                    $scope.lastVideoId = videoId;
                    $scope.scriptNotAdded = false;
                    var tag = document.createElement('script');
                    tag.src = 'https://www.youtube.com/iframe_api';
                    var firstScriptTag = document.getElementsByTagName('script')[0];
                    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

                    $window.onYouTubeIframeAPIReady = function () {
                        $window.player = new $window.YT.Player('player', {
                            height: '0',
                            width: '0',
                            videoId: $scope.lastVideoId,
                            playerVars: {'origin': 'http://www.greatvideo.org/', 'modestbranding':1, 'enablejsapi': 1, 'autoplay': 1, 'controls': 1, 'playsinline': 1},
                            events: {
                                'onStateChange': $window.onPlayerStateChange,
                                'onReady': $window.onPlayerReady
                            }
                        });
                    };
                    $scope.$emit('masonry.reposition');
                } else {
                    if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
                        $scope.$emit('masonry.reposition');
                        window.player.loadVideoById(videoId);
                    } else {
                        $scope.$emit('masonry.reposition');
                        window.player.loadVideoById(videoId, 5, 'medium');
                    }
                }
                if ('undefined' !== typeof(data) && data.hasOwnProperty('title')) {
                    document.title = data.title + '- Great Videos!';
                    title = '/' + encodeURIComponent(data.title);
                }
                if (title) {
                    $location.path('/video/' + videoId + title + '.html', false);
                }
            }

            function getAndLoadSingleVideoData(id) {
                for (var i in $scope.videos) {
                    if ($scope.videos[i].id === id) {
                        $scope.singleVideoData = $scope.videos[i];
                    }
                }
            }


          ////////////////// //************ SOCKET CONTROL ************//  //////////////////


            function socketGetSingleVideo(videoId) {
                var term;
                $scope.showLoading = true;
                $scope.activeVideo = videoId;

                loadPlayer($scope.activeVideo, true);
                // Put player in main video box
                document.getElementById('player').setAttribute(
                    'style', 'height: 385px; width: 722px;');
                // resizePlayerForInitialLoadSingleVideo(true);

                YoutubeService.getSingleVideo($scope.activeVideo).then(function (data) {
                    // Possibly a disallowed video do a a search on the terms in the url
                    $scope.singleVideoData = data.data;
                    $rootScope.singleVideoDataId = data.data.id;
                    $rootScope.waitForFinalEvent(function () {
                        $rootScope.$emit('calcRatingMain', $scope.singleVideoData.rating);
                    }, 500, '2232');
                    // $scope.getRelatedVideosForSingleVideos();
                    // $rootScope.elementSaved = jQuery('#player');
                    // $log.debug($scope.videos);
                });
            }

            function videoStatusUpdate(data) {
                var currentStatus,
                    newVideo = false;
                switch (data.status) {
                    case 'Playing...':
                        // TODO: Add new video functionality
                        // console.log(data);

                        // Weird logic. First Video sends out 7 or so calls every second to get the client in sync
                        // When in sync (playing) it ignore subsquent sync calls until completely synced.

                        if ($scope.countStartup && data.hasOwnProperty('count') && data.count) {
                            $scope.countStartup = true;
                            return;
                        } else if (data.hasOwnProperty('count') && data.count === false) {
                            $scope.countStartup = false;
                        } else {
                            $scope.countStartup = true;
                            if (navigator.userAgent.match(/(iPad|iPhone|iPod)/g)) {
                                window.player.loadVideoById(data.videoId);
                            } else {
                                window.player.loadVideoById(data.videoId, 5, 'medium');
                            }

                            // Video Changed
                            if ($rootScope.singleVideoDataId === data.videoId) {
                                window.player.seekTo(data.time);
                            }

                            $rootScope.singleVideoDataId = data.videoId;
                            if (data.hasOwnProperty('title')) {
                                var el = document.getElementsByClassName('videoTitle')[0];
                                el.innerHTML = '<span class=\'roomVideo\'>Room Video: </span>' + data.title;
                            }

                        }

                        break;
                    case 'Paused.':
                        window.player.pauseVideo();
                        break;
                    case 'Buffering...':
                        currentStatus = 'Buffering...';
                        break;
                    case 'Video Cued.':
                        currentStatus = 'Video Cued.';
                }
            }

            $rootScope.$on('resp-videoStatus', function(ev, data) {
                // $log.debug(data);
                videoStatusUpdate(data.data);
            });


            $scope.findIndex = function(array, key, value) {
                var i;
                for (i = 0; i < array.length; i++) {
                    if (array[i].hasOwnProperty(key) && array[i][key] === value) {
                        return i;
                    }
                }
                return -1;
            };

            $rootScope.$on('resp-currentUsers', function(ev, data) {
                // $log.debug(data);
                $scope.users = data.users;

                // CloseBox if your room no longer exists
                if ($scope.findIndex(data.users, 'idx', $rootScope.joinedRoom) === -1 && $rootScope.joinedRoom && ($rootScope.showChatArea2 || $rootScope.showChatArea1 )) {
                    // console.log('host has left');
                    $rootScope.joinedRoom = '';
                    $rootScope.showChatArea2 = false;
                    $rootScope.showChatArea1  = false;
                    $scope.hostDisconnected = true;
                    var box = angular.element(document.getElementsByClassName('masonry-brick open')),
                        box2 = angular.element(document.getElementsByClassName('main-video'));
                    box.css({});
                    box2.css({});
                }

            });

            $rootScope.$on('resp-joinedRoomSuccess', function(ev, data) {
                // console.log('joinedRoomSuccess');
                $scope.hostDisconnected = false;
                var box = angular.element(document.getElementsByClassName('main-video'));
                box.show();
                $rootScope.elementSaved = undefined;
                socketGetSingleVideo(data.data.videoId);
                if (!$scope.videosBack) {
                    $scope.videosBack = angular.copy($scope.videos);
                    $scope.videos = [];
                }

                setTimeout(function(){
                    box.css({width:'960px',marginLeft: '-463px'});
                    $rootScope.showChatArea2 = true;
                    $rootScope.showChatArea1 = false;
                    resizePlayerForInitialLoadSingleVideo();
                },1000);
            });

            $rootScope.$on('resp-userInRoom', function(ev, data) {
                // For person playing the video
                var box = angular.element(document.getElementsByClassName('masonry-brick open')),
                    box2 = angular.element(document.getElementsByClassName('main-video'));
                setTimeout(function () {
                    if (angular.element(document.getElementsByClassName('main-video')).is(':visible')) {
                        box2.css({width: '960px', marginLeft: '-463px'});
                        setTimeout(function() {
                            $rootScope.showChatArea2 = true;
                            $rootScope.showChatArea1 = false;
                            resizePlayerForInitialLoadSingleVideo();
                        },1000);
                    } else {
                        // chat area one is outside of flow fixed
                        $rootScope.showChatArea1 = true;
                    }
                }, 500);
                // console.log('USERSINROOM');
                // console.log($rootScope.usersInRoom);
                $scope.usersInRoom = $rootScope.usersInRoom;
            });

            $scope.joinRoom = function(id) {
                if ($rootScope.currentSocketId !== id) {
                    $rootScope.$emit('socket-joinRoom', {'idx': id});
                }
            };

            $scope.scroll = function() {
                var objDiv = document.getElementsByClassName('chatText')[0];
                objDiv.scrollTop = objDiv.scrollHeight;
            };

            $rootScope.$on('resp-sentChat', function(ev, data) {
                // console.log('Chat Recieved');
                // console.log(data);

                var you = '';

                if ($rootScope.currentSocketId === data.user) {
                    you = '<b>(YOU)</b>';
                }
                $scope.chatText += '<br>' + you + ' User' +  $filter('cut')(data.user,true,3,': ') + data.chat;
                $scope.scroll($rootScope.currentSocketId);
            });

            $scope.submitChat = function() {
                // console.log('CHAT TEXT');
                // console.log($scope.chatTextSend);
                var $elVal = angular.element(document.getElementById('chatMessageText1'));
                var $elVal2 = angular.element(document.getElementById('chatMessageText2'));
                $scope.chatTextSend = $elVal2.val() || $elVal.val();

                if ($scope.chatTextSend) {
                    $rootScope.$emit('socket-sentChat', {'user': $rootScope.currentSocketId, 'chat': $scope.chatTextSend, 'room': $rootScope.joinedRoom});
                    $elVal2.val('');
                    $elVal.val('');
                    $scope.chatTextSend = '';
                }
            };

            ////////////////// // ************* END SOCKET CONTROL ************//  //////////////////

            $window.onPlayerStateChange = function (e) {
                var currentStatus,
                    tempVideo,
                    useThisVideoId;


                switch (e.data) {
                    case -1:
                        currentStatus = 'Unstarted';
                        break;
                    case 0:
                        currentStatus = 'Ended.';
                        if ($scope.singleVideoData.hasOwnProperty('id')) {
                            useThisVideoId = $scope.singleVideoData.id;
                        } else {
                            useThisVideoId = $scope.singleVideoData.videoId;
                        }

                        tempVideo = returnNextVideoId(useThisVideoId);
                        if (!angular.isDefined(tempVideo)){
                            $rootScope.singleVideoDataId = $scope.videos[0].id;
                        } else {
                            $rootScope.singleVideoDataId = tempVideo;
                        }
                        $scope.lastVideoId = $rootScope.singleVideoDataId;
                        $scope.activeVideo = $rootScope.singleVideoDataId;
                        getAndLoadSingleVideoData($rootScope.singleVideoDataId);
                        loadPlayer($scope.activeVideo, $scope.singleVideoData);
                        break;
                    case 1:
                        currentStatus = 'Playing...';
                        // $analytics.eventTrack('playerstate-' +currentStatus);
                        break;
                    case 2:
                        currentStatus = 'Paused.';
                        break;
                    case 3:
                        currentStatus = 'Buffering...';
                        break;
                    case 5:
                        currentStatus = 'Video Cued.';
                        break;
                    default:
                        break;
                }
                $rootScope.$emit('socket-videoStatusUpdate', {status:currentStatus, videoId: $rootScope.singleVideoDataId, time: parseInt($window.player.getCurrentTime())});
            };

            function allowedToPlayVideos() {
                var userRegion = '';
                if ($scope.playerReady) {
                    $rootScope.waitForFinalEvent(function () {
                        if (angular.isUndefined($rootScope.singleVideoDataId)) {
                            // Antivirus Vidoes for initial load
                            if (!$routeParams.hasOwnProperty('searchTerm')) {
                                // Show user videos based on region
                                YoutubeService.getUserRegion().then(function(data){
                                    if (data.hasOwnProperty('code')) {
                                        $scope.countryCode = data.code;
                                        $scope.searchTerm = 'regionSearchNotAUserSearch__' + data.code;
                                        youtubeSearch($scope.searchTerm, true);
                                    } else {
                                        $scope.searchTerm = 'music videos';
                                        youtubeSearch($scope.searchTerm, true);
                                    }
                                });
                            }
                        } else {
                            angular.element(document.getElementById($rootScope.singleVideoDataId)).find('.img-area').click();
                            // $analytics.eventTrack('allowedToPlayVideosImgAreaClick');
                        }
                    }, 500, '123xvv');
                }
            }

            // SHOULDN'T BE HERE I KNOW
            $window.onPlayerReady = function () {
                $scope.playerReady = true;
                if ($scope.ranPlayerReady) {
                    $scope.ranPlayerReady = false;
                    if (!$routeParams.hasOwnProperty('videoId')) {
                        $scope.closeMainBox();
                        allowedToPlayVideos();
                    }
                } else {
                    //allowedToPlayVideos();
                }
            };

            $window.onPlayerReady();

            $scope.singleVideoData = {};

            // TODO: NEED TO EXTRACT GENERAL CATEGORIES FROM VIDEOS THEN DO A SEARCH FOR THOSE
            // WHEN RELATED VIDEOS RUN OUT OR JUST KEEP DOING RELATED VIDEO SEARCHES BASED ON
            // THE Related Vidoes Shown

            function getRelatedVideos(video) {
                var tempVideo,
                    videoId;
                if(!angular.isDefined($scope.lastVideoIdUndefinedTest)) {
                    tempVideo = returnNextVideoId($scope.lastVideoId);

                    // Do Some Hacky Shit to get some more videos for users with not a lot of videos
                    if (!angular.isDefined(tempVideo)) {
                        $log.debug('tempVideo not Defined');

                        if (angular.isDefined($scope.videos[$scope.undefinedCounter]) && ($scope.videos[$scope.undefinedCounter].id === $scope.lastVideoId || $scope.undefinedCounter === 0 || !angular.isDefined(tempVideo))) {
                            $log.debug('counter activated');
                            $scope.lastVideoId = $scope.videos[$scope.undefinedCounter].id;
                            $scope.undefinedCounter++;
                        }
                        video = $scope.lastVideoId;


                    } else {
                        $scope.lastVideoId = tempVideo;
                        video = tempVideo;
                    }
                }

                YoutubeService.getRelatedVideos(10, video).then(function (data) {
                    $scope.showLoading = false;
                    $scope.showLoadingFancy = false;
                    $scope.canLoadMoreVideos = true;
                    var uniqueVideos = $scope.excludeSameVideos(data.data.items);
                    if (uniqueVideos.length === 0) {
                        $scope.lastVideoIdUndefinedTest = undefined;
                    }
                    $scope.videos = $scope.videos.concat(uniqueVideos);
                    $rootScope.totalVideos += uniqueVideos.length;
                    // $analytics.eventTrack('gotRelatedVideos');
                });
            }

            $rootScope.$on('$ifSearchVideosRunOut', function() {
                $scope.undefinedCounter = 0;
                $scope.lastVideoId = $scope.videos[0].id;
                $scope.$emit('masonry.reload');
                getRelatedVideos($scope.lastVideoId);
            });

            // Move to directive
            function resizePlayerForInitialLoadSingleVideo(isLargeSocketWindow) {
                var playerWidth = document.getElementById('player').offsetWidth,
                    halfPlayerWidth = 340;
                if ($rootScope.showChatArea2) {
                    halfPlayerWidth = 450;
                }
                if (playerWidth > 305 && playerWidth !== 1) {
                    document.getElementById('player').setAttribute('style', 'left:' + (window.innerWidth / 2 - halfPlayerWidth) + 'px;' + 'top: 50px;');
                }
            }

            jQuery(window).resize(function () {
                if (!$rootScope.hasOwnProperty('elementSaved')) {
                    $rootScope.waitForFinalEvent(function () {
                        resizePlayerForInitialLoadSingleVideo();
                    }, 500, 'blahblah');
                }
            });

            function getRelatedVideosPromise(video) {
                return YoutubeService.getRelatedVideos(20, video, true);
            }

            $rootScope.$on('closeMainBox', function () {
                $scope.closeMainBox();
            });

            $scope.getRelatedVideosForSingleVideos = function () {
                YoutubeService.clearEverythingNewSearch();
                getRelatedVideosPromise($scope.activeVideo).then(function (data) {
                    var tempVideos = data.data.items;
                    $rootScope.totalVideos += data.data.items.length;
                    $scope.videos = tempVideos;
                    $scope.showLoading = false;
                    $scope.showLoadingFancy = false;
                    // $log.debug('Related Videos Results');
                    // Put the single video in the results and play it
                    /*
                     if (tempVideos.length > 1) {
                     tempVideos.splice(2, 0, $scope.singleVideoData);

                     }
                     */
                    if (!$scope.initialLoad) {
                        allowedToPlayVideos($scope.singleVideoData.id);
                    } else {
                        $scope.initialLoad = false;
                    }
                    // $analytics.eventTrack('gotSingleVideoData - gotRelatedVidoes');
                });
            };


            $scope.checkStash = function(id, remove) {
                var found = false;
                for (var i = 0; i < $scope.videoStash.length; i++) {
                    if ($scope.videoStash[i].id === id) {
                        found = true;
                        if (remove) {
                            $scope.videoStash.splice(i,1);
                            return true;
                        }
                        break;
                    }
                }
                if (found) {
                    return true;
                } else {
                    return false;
                }
            };

            $scope.markVideosAsInStash = function() {
                for (var i = 0; i < $scope.videoStash.length; i++) {
                    jQuery('#' + $scope.videoStash[i].id + ' .save-video-text').html('Remove?');
                }
            };

            $scope.utilityStashFunction = function(idToFind, returnVideoObj) {
                for (var j = 0; j < $scope.videos.length; j++) {
                    if ($scope.videos[j].id === idToFind) {
                        if (returnVideoObj) {
                            return $scope.videos[j];
                        }
                        break;
                    }
                }

                if (!$scope.checkStash(idToFind)) {
                    if (!angular.isDefined($scope.videos[j]) && angular.isDefined($scope.singleVideoData)) {
                        $scope.videoStash.push($scope.singleVideoData);
                    } else {
                        $scope.videoStash.push($scope.videos[j]);
                    }

                }

            };

            $scope.addToStash = function (id, $event) {
                var $currentEl = angular.element($event.currentTarget);
                if ($currentEl.html().indexOf('Remove') !== -1) {
                    $scope.checkStash(id, true);
                    $currentEl.find('.save-video-text').html(' Save Video');
                } else {
                    $scope.utilityStashFunction(id, false);
                    $currentEl.find('.save-video-text').html('Remove?');
                }
                $localStorage.greatVideoStash = $scope.videoStash;
            };

            $scope.openMenu = function($event) {
                var $currentEl = angular.element($event.currentTarget),
                    $headerEl = angular.element(document.getElementsByClassName('header')[0]);
                if ($headerEl.hasClass('menu-closed')) {
                    $currentEl.removeClass('closed');
                    $headerEl.removeClass('menu-closed');
                    $currentEl.removeClass('fa-angle-down').addClass('fa-angle-up');
                    $scope.menuClosed = false;
                } else {
                    $currentEl.removeClass('fa-angle-up').addClass('fa-angle-down');
                    $headerEl.addClass('slide-height');
                    $currentEl.addClass('closed');
                    setTimeout(function() {
                        $headerEl.addClass('menu-closed');
                    },10);
                    $scope.menuClosed = true;
                }
            };

            $scope.loadStashIntoView = function () {

                delete $rootScope.elementSaved;
                $scope.videosTemp = $scope.videos;
                $scope.videos = $scope.videoStash;
                $scope.closeMainBox();
                jQuery('body').scrollTop(0);
                showSmallWindow();
                $scope.$broadcast('masonry.reload', true);
            };

            function youtubeSearch(searchTerm, newSearch) {
                // $scope.closeMainBox();
                $scope.showLoading = true;
                $rootScope.waitForFinalEvent(function () {
                    jQuery('.ui-autocomplete').hide();
                }, 700, 'asd829');
                YoutubeService.getYoutubeFeed(20, searchTerm).then(function (data) {
                    $scope.canLoadMoreVideos = true;
                    if (newSearch) {
                        $scope.playerReady = true;
                        $rootScope.totalVideos = data.data.items.length;
                        $scope.videos = data.data.items;
                    } else {
                        var uniqueVideos = $scope.excludeSameVideos(data.data.items);
                        if ('undefined' === typeof(data.data.items)) {
                            // reset searchTerm
                            $scope.searchTerm = '';
                            // start getting getRelatedVideos
                            getRelatedVideos($scope.videos[0].id);
                        } else {
                            $rootScope.totalVideos += uniqueVideos.length;
                            $scope.videos = $scope.videos.concat(uniqueVideos);
                        }
                    }
                    $scope.showLoading = false;
                    $scope.showLoadingFancy = false;
                    // $analytics.eventTrack('youtubeSearchFunctiongot20Videos' + searchTerm);
                });
            }


            // ************* SINGLE VIDEO ONLOAD *****************//
            // Get Single Video on Load
            if ($routeParams.hasOwnProperty('videoId')) {
                var videoId,
                    term;
                $scope.showLoading = true;
                $scope.activeVideo = $routeParams.videoId;

                loadPlayer($scope.activeVideo);
                // Put player in main video box
                resizePlayerForInitialLoadSingleVideo();
                angular.element(document.getElementsByClassName('backdrop-special')[0]).height(window.innerHeight + 10);
                $scope.showBackDropSpecial = true;
                YoutubeService.getSingleVideo($scope.activeVideo).then(function (data) {
                    // Possibly a disallowed video do a a search on the terms in the url
                    if (!angular.isDefined(data.data)) {
                        $log.debug('Disallowed Video');
                        $scope.closeMainBox();
                        videoId = window.location.href.split('/');
                        if (videoId[4].indexOf('.html') !== -1) {
                            term = videoId[4].replace('.html','');
                        } else if (videoId[5].indexOf('.html') !== -1) {
                            term = videoId[5].replace('.html','');
                        } else if (videoId[6].indexOf('.html') !== -1) {
                            term = videoId[6].replace('.html','');
                        } else if (angular.isDefined(videoId[6])) {
                            term = videoId[6];
                        } else if (angular.isDefined(videoId[5])) {
                            term = videoId[5];
                        }
                        $log.debug('Disallowed Term' + term);
                        if (term && term.length !== 11) {
                            term = decodeURIComponent(term);
                            $scope.searchTerm = term;
                            var $elVal = angular.element(document.getElementById('youtubeSearch'));
                            $elVal.val($scope.searchTerm);
                            youtubeSearch($scope.searchTerm, true);
                        } else {
                            $location.path('/', true);
                        }
                    } else {
                        $scope.singleVideoData = data.data;
                        $rootScope.singleVideoDataId = data.data.id;
                        $rootScope.waitForFinalEvent(function () {
                            $rootScope.$emit('calcRatingMain', $scope.singleVideoData.rating);
                        }, 500, '2232');
                        $scope.getRelatedVideosForSingleVideos();
                    }
                    // $rootScope.elementSaved = jQuery('#player');
                    // $log.debug($scope.videos);
                });
            } else if ($routeParams.hasOwnProperty('searchTerm')) {
                // var playerElWidth = jQuery('#player').width();
                $scope.closeMainBox();
                $scope.searchTerm = $routeParams.searchTerm;
                var $elVal = angular.element(document.getElementById('youtubeSearch'));
                $elVal.val($scope.searchTerm);
                $scope.searchTerm = $elVal.val();
                $scope.canLoadMoreVideos = true;
                youtubeSearch($scope.searchTerm, true);
            }

            // $scope.lastVideoId;
            $scope.canLoadMoreVideos = true;

            $scope.youtubeObj = YoutubeService.youtubeObj;


            // NORMAL YOUTUBE SEARCH
            // youtubeSearch($scope.searchTerm, true);

            $scope.searchAction = function () {
                $scope.reArranged = false;
                delete $rootScope.elementSaved;
                jQuery('.ui-autocomplete').hide();
                // $scope.$broadcast('masonry.reload', true);
                if (angular.element(document.getElementsByClassName('main-video')).is(':visible')) {
                    $scope.closeMainBox(true);
                }
                if (document.getElementById('player').offsetWidth > 100) {
                    showSmallWindow();
                }
                if ($window.hasOwnProperty('player')) {
                    // $window.player.stopVideo();
                }
                $scope.playerReady = false;
                $scope.showLoading = true;
                YoutubeService.clearEverythingNewSearch();
                YoutubeService.youtubeObj.lastVideoSearch = '';
                $scope.lastVideoId = undefined;
                // TODO: NEED TO APPEND PLAYER TO SAFE ZONE TO USE AGAIN
                //TODO: HACK
                var $elVal = angular.element(document.getElementById('youtubeSearch'));
                $scope.searchTerm = $elVal.val();
                youtubeSearch($scope.searchTerm, true);
                $rootScope.waitForFinalEvent(function () {
                    $scope.$broadcast('masonry.reload', true);
                    $scope.showLoading = false;
                    $scope.showLoadingFancey = false;
                }, 2000, '2232sc');
                // $analytics.eventTrack('searchBoxClicked');
            };


            $scope.$on('videoPlayed', function (items, data) {
                $scope.singleVideoData = data;
                $scope.lastVideoIdUndefinedTest = data.videoId;
                if (angular.isDefined(data.videoId)) {
                    $scope.lastVideoId = data.videoId;
                }
                loadPlayer(data.videoId, $scope.utilityStashFunction(data.videoId, true));
                $scope.$broadcast('masonry.reload', true);
                $scope.playerEl2 = angular.element(document.getElementById('player'));
                $scope.playerEl2.addClass('animateBrick');
                $rootScope.waitForFinalEvent(function () {

                    getRelatedVideos(data.videoId);
                }, 4000, '982kc');
            });

            function returnNextVideoId(videoId) {
                var $el = angular.element(document.getElementById(videoId));
                return $el.next().attr('id');
            }

            $scope.doDesiredSearchAction = function () {
                if ($scope.canLoadMoreVideos) {
                    $scope.canLoadMoreVideos = false;
                    if (angular.isUndefined($scope.lastVideoId)) {
                        if ($scope.searchTerm === '') {
                            $rootScope.singleVideoDataId = returnNextVideoId($rootScope.singleVideoDataId);
                            $scope.lastVideoId = $rootScope.singleVideoDataId;
                            getRelatedVideos($rootScope.singleVideoDataId);
                        } else {
                            youtubeSearch($scope.searchTerm, false);
                        }
                    } else {
                        getRelatedVideos($scope.lastVideoId);
                    }
                }
            };

            $scope.loadMoreVideos = function () {
                // TODO Need either to show last Video ID, Last Search Term, or Related Video (from url or one which they played
                // TODO whichever one is available
                $scope.showLoading = true;
                if (YoutubeService.youtubeObj.canLoadMoreSpecialCaseSwitchedFromRelatedToSearch) {
                    $scope.canLoadMoreVideos = true;
                    // IMPORTANT TO MAKE THE SWITCH WHEN RELATED RUN OUT
                    $scope.lastVideoId = undefined;
                    YoutubeService.youtubeObj.canLoadMoreSpecialCaseSwitchedFromRelatedToSearch = false;
                }

                $scope.doDesiredSearchAction();
            };

            $scope.setThumb = function (thumbSize) {
                if (thumbSize === 'small') {
                    $scope.thumbSize = 'mqdefault';
                    $rootScope.bigThumbSize = false;
                } else {
                    $scope.thumbSize = 'mqdefault';
                    $rootScope.bigThumbSize = true;
                }
                $scope.$emit('masonry.reposition');
                $rootScope.waitForFinalEvent(function () {
                    $scope.$emit('masonry.reposition');
                    $scope.$broadcast('masonry.reload', true);
                }, 1000, '542kc');
            };

            $scope.setFilter = function (searchType) {
                jQuery('html, body').animate({ scrollTop: 0 }, 'slow');

                if ($window.hasOwnProperty('player')) {
                    // $window.player.stopVideo();
                }

                var playerWidth = document.getElementById('player').offsetWidth;
                if (playerWidth > 305 && playerWidth !== 1) {
                    showSmallWindow();
                }
                $scope.videos = [];
                $rootScope.totalVideos = 0;
                $scope.$broadcast('masonry.reload', true);
                $scope.searchType = searchType;
                YoutubeService.setSearchType(searchType);
                YoutubeService.youtubeObj.lastVideoSearch = '';
                YoutubeService.clearEverythingNewSearch();
                if ($scope.searchTerm) {
                    youtubeSearch($scope.searchTerm, true);
                } else {
                    $scope.doDesiredSearchAction();
                }
                var box = angular.element(document.getElementsByClassName('main-video'));
                box.hide();

                $scope.showLoading = false;
                $scope.showLoadingFancy = false;
            };

            $scope.reloadMasonry = function () {
                $scope.$broadcast('masonry.reload');
            };

            // *** Crappy Stuff *****

            // Infinite Scroll
            $rootScope.issetTop = false;
            window.onscroll = function () {
                if (!$scope.videosBack) {
                    var top = (document.documentElement && document.documentElement.scrollTop) ||
                        document.body.scrollTop;
                    if ($rootScope.hasOwnProperty('elementSaved')) {
                        var playerPos = $rootScope.elementSaved[0].style.top.replace('px', '');
                        if (top - 500 < playerPos && playerPos < top + window.innerHeight - 105) {
                            if (angular.isDefined($scope.lastVideoId)) {
                                $scope.$emit('masonry.reposition', {'speedUp': true});
                            }
                        } else {
                            if (angular.isDefined($scope.lastVideoId)) {
                                showSmallWindow();
                            }
                        }
                    }

                    if (top >= (document.body.offsetHeight - window.innerHeight) - 200) {
                        $rootScope.waitForFinalEvent(function () {
                            $scope.loadMoreVideos();
                        }, 100, '293dcw');
                    }
                }
            };

            jQuery(window).resize(function () {
                if ($rootScope.hasOwnProperty('elementSaved')) {
                    $rootScope.waitForFinalEvent(function () {
                        $scope.$emit('masonry.reposition');
                    }, 100, 'blahsxh2');
                }
            });


        }
    ]);
