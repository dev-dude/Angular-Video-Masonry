'use strict';

/* global angular */

angular.module('youtube2App').factory('YoutubeService', [
    '$http',
    '$log',
    '$q',
    '$rootScope',
    function ($http, $log, $q, $rootScope) {

        var youtubeObj;

        function YoutubeClass() {

            var self = this;

            this.lastVideoSearch = '';
            this.searchType = 'relevance';

            this.clearEverythingOnNewSearch = function() {
                this.lastVideoLookUp = '';
                this.lastVideoPageNumber = 1;
                this.lastVideoSearchNumber = 1;
                this.itemsPerPage = 0;
                this.canLoadMoreSpecialCaseSwitchedFromRelatedToSearch = false;
                // CHANGED THIS IF IT FAILS
                this.totalItems = 0;
                this.startIndex = 0;
            };

            this.addCommas = function(nStr) {
                nStr += '';
                var x = nStr.split('.');
                var x1 = x[0];
                var x2 = x.length > 1 ? '.' + x[1] : '';
                var rgx = /(\d+)(\d{3})/;
                while (rgx.test(x1)) {
                    x1 = x1.replace(rgx, '$1' + ',' + '$2');
                }
                return x1 + x2;
            };

            this.updateSingleItem = function(obj) {
                var newDate = new Date(obj.uploaded);
                obj.uploaded = (newDate.getMonth() + 1) + '/' + newDate.getDate() + '/' + newDate.getFullYear();
                // update likes
                obj.likeCount = self.addCommas(parseInt(obj.likeCount));
                // update views
                obj.viewCount = self.addCommas(obj.viewCount);
                return obj;
            };

            this.updateItems = function(data) {
                if (angular.isDefined(data)) {
                    data.map(function (obj) {
                        return self.updateSingleItem(obj);
                    });
                }
            };

            // Default Url
            this.url = 'http://gdata.youtube.com/feeds/api/videos/?v=2&alt=jsonc' +
                '&paid-content=false' +
                '&duration=long' +
                '&orderby='+ this.searchType +
                '&max-results=5';
            this.getJsonFeed = function () {
                var deferred = $q.defer();
                if (this.itemsPerPage !== 0 && (self.startIndex + self.itemsPerPage) + 1 > self.totalItems && this.lastVideoSearch.indexOf('regionSearchNotAUserSearch') === -1) {
                    $log.debug('Related Videos Exhausted');
                    self.canLoadMoreSpecialCaseSwitchedFromRelatedToSearch = true;
                    self.itemsPerPage = 0;
                    self.clearEverythingOnNewSearch();
                    $rootScope.$emit('$ifSearchVideosRunOut');
                    return deferred.promise;
                } else {
                    $http(
                        {method: 'GET',
                            url: this.url}
                    ).
                        success(function (data) {

                            self.totalItems = data.data.totalItems;
                            self.itemsPerPage = data.data.itemsPerPage;
                            self.startIndex = data.data.startIndex;

                            if (data.data.id && !angular.isArray(data.data)) {
                                self.updateSingleItem(data.data);
                            } else if (angular.isArray(data.data.items)) {
                                self.updateItems(data.data.items);
                            }
                            deferred.resolve(data);
                        }).
                        error(function (data) {
                            deferred.resolve(data);
                        });
                    return deferred.promise;
                }
            };
            this.checkifNewVideo = function(currentVideo) {
                if (this.lastVideoLookUp === currentVideo) {
                    // paginate
                    this.lastVideoPageNumber += 1;
                } else {
                    this.lastVideoPageNumber = 1;
                }
                this.lastVideoLookUp = currentVideo;
            };
            this.paginateSearch = function(search) {
                if (this.lastVideoSearch === search) {
                    // paginate Search
                    this.lastVideoSearchNumber += 1;
                }
                this.lastVideoSearch = search;
            };
            this.getSingleVideo = function(videoId) {
                this.url = 'https://gdata.youtube.com/feeds/api/videos/'+videoId+'?v=2&alt=jsonc';
                return this.getJsonFeed();
            };
            this.checkIfValidRegion = function(countryCode) {
                var massiveCountryCodeString = 'AR, AU, AT, BE, BR, CA, CL, CO, CZ, EG, FR,' +
                    'DE, HK, HU, IN, IE, IL, IT, JP, JO, MY, MX, MA, NL, NZ, PE, PH, PL, RU,' +
                    'SA, SG, ZA, KR, ES, SE, CH, TW, AE, US';
                if (massiveCountryCodeString.indexOf(countryCode) !== -1) {
                    return countryCode;
                } else {
                    return 'US';
                }
            };
            this.getUserRegion = function() {
                var deferred = $q.defer();
                $http(
                    {method: 'GET',
                        url: 'http://www.greatvideo.org/ipLookUp/' + window.currentIp}
                    ).
                    success(function (data) {
                        deferred.resolve(data);
                    }).
                    error(function (data) {
                        deferred.resolve(data);
                    });
                return deferred.promise;
            };
            this.getMultipleVideos = function(count, searchTerm) {
                this.paginateSearch(searchTerm);
                var counter = 1,
                    searchParam,
                    countryCode,
                    acceptedCountryCode;
                if (this.lastVideoSearchNumber !== 1) {
                    counter = this.lastVideoSearchNumber *  count;
                }

                // Hacky Crap bc im lazy and want to keep it DRY do a region search
                if (searchTerm.indexOf('regionSearchNotAUserSearch') !== -1) {
                    countryCode = searchTerm.split('__');
                    acceptedCountryCode = this.checkIfValidRegion(countryCode[1]);
                    searchParam = 'http://gdata.youtube.com/feeds/api/standardfeeds/'+ acceptedCountryCode + '/most_popular/?v=2&time=today&alt=jsonc';
                } else {
                    searchParam = 'http://gdata.youtube.com/feeds/api/videos/?v=2&alt=jsonc' +
                        '&q=' + encodeURIComponent(searchTerm);
                }

                this.url = searchParam +
                    '&paid-content=false' +
                    '&orderby='+ this.searchType +
                    '&start-index='+ counter +
                    '&max-results='+count;
                return this.getJsonFeed();
            };
            this.getRelatedVideos = function(count, video, singleVideoSpecialCase) {
                this.checkifNewVideo(video, singleVideoSpecialCase);
                var startIndex = this.lastVideoPageNumber *  count;
                if (angular.isDefined(singleVideoSpecialCase)) {
                    startIndex = 1;
                }
                this.url = 'https://gdata.youtube.com/feeds/api/videos/'+video+'/' +
                    'related?v=2&alt=jsonc' +
                    '&orderby='+ this.searchType +
                    '&start-index='+ startIndex +
                    '&max-results=' + count;
                return this.getJsonFeed();
            };
        }

        /* init */
        youtubeObj = new YoutubeClass();
        youtubeObj.clearEverythingOnNewSearch();

        /* Public Api */
        return {
            youtubeObj : youtubeObj,
            clearEverythingNewSearch: function() {
                youtubeObj.clearEverythingOnNewSearch();
            },
            getUserRegion: function() {
                return youtubeObj.getUserRegion();
            },
            setSearchType: function(searchType) {
                youtubeObj.searchType = searchType;
            },
            getSingleVideo: function(videoId) {
                return youtubeObj.getSingleVideo(videoId);
            },
            getRelatedVideos: function(count, video, singleVideoSpecialCase) {
                return youtubeObj.getRelatedVideos(count, video, singleVideoSpecialCase);
            },
            getYoutubeFeed: function (count, searchTerm) {
                return youtubeObj.getMultipleVideos(count, searchTerm);
            },
            getSingleYoutubeVideo: function (videoId) {
                return youtubeObj.getSingleVideo(videoId);
            }
        };
    }
]);