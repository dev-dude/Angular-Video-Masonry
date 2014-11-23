'use strict';

/* global angular */
/* global io */

angular.module('youtube2App').factory('uSocket', ['$rootScope', 'socketFactory', function($rootScope, socketFactory) {

    var windowLocation = window.location.hostname,
        port = ':3000';

    if (window.location.hostname.indexOf('greatvideo') !== -1) {
        port = ':80';
    }

    var socket = socketFactory({
        prefix: 'foo~',
        ioSocket: io.connect(windowLocation+port)
    });

    $rootScope.joinedRoom = '';
    $rootScope.usersInRoom = [];
    $rootScope.currentSocketId = '';

    socket.forward('resp-clientId', $rootScope);
    socket.forward('resp-videoStatus', $rootScope);
    socket.forward('resp-currentUsers', $rootScope);
    socket.forward('resp-joinedRoomSuccess', $rootScope);
    socket.forward('request-getTime', $rootScope);
    socket.forward('resp-userInRoom', $rootScope);
    socket.forward('resp-sentChat', $rootScope);


    //TODO: Need to Broadcast video status on an interval so taht when a user joins they get the latest

    $rootScope.$on('foo~resp-clientId', function (ev, data) {
        // console.log('got client Id');
        // console.log('data.clientId');
        $rootScope.currentSocketId = data.clientId;
    });

    $rootScope.$on('foo~resp-videoStatus', function (ev, data) {
        // console.log('got status');
        // console.log(data);
        $rootScope.$emit('resp-videoStatus', {data: data});
    });

    $rootScope.$on('foo~resp-currentUsers', function (ev, data) {
        // console.log('got users');
        // console.log(data);
        $rootScope.$emit('resp-currentUsers', {users: JSON.parse(data)});
    });

    $rootScope.$on('foo~resp-userInRoom', function (ev, data) {
        $rootScope.usersInRoom = JSON.parse(data);

        // You are the room when other ppl join
        if ($rootScope.currentSocketId === $rootScope.usersInRoom.room) {
            $rootScope.joinedRoom = $rootScope.currentSocketId;
        }

        // console.log('got users in room!');
        // console.log($rootScope.usersInRoom);

        // console.log('user in room' + data.idx);
        // console.log(data);

        if (!data.hasOwnProperty('userLeft')) {
            $rootScope.$emit('resp-userInRoom', data);
        }

    });


    $rootScope.playerStateTranslator = function(playerStateNumber) {
        var currentStatus;
        switch (playerStateNumber) {
            case -1:
                currentStatus = 'Unstarted';
                break;
            case 0:
                currentStatus = 'Ended.';
                break;
            case 1:
                currentStatus = 'Playing...';
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
        }
        return currentStatus;
    };

    // Get a new joining user up to speed
    function requestPlayerStateEverySecond() {
        var count = 1;
        $rootScope.intervalPLayerStateChecker = setInterval(function(){
            if (count > 7) {
                socket.emit('socket-videoStatusUpdate', {status:$rootScope.playerStateTranslator(window.player.getPlayerState()), title:window.player.getVideoData().title, videoId: $rootScope.singleVideoDataId, time: parseInt(window.player.getCurrentTime()), upToSpeedEvent: true, count: false});
                clearInterval($rootScope.intervalPLayerStateChecker);
            }
            // console.log('PlayerStateUpdatorRunning');
            socket.emit('socket-videoStatusUpdate', {status:$rootScope.playerStateTranslator(window.player.getPlayerState()), title:window.player.getVideoData().title, videoId: $rootScope.singleVideoDataId, time: parseInt(window.player.getCurrentTime()), upToSpeedEvent: true, count: count});
            count++;
        },1000);
    }
    $rootScope.$on('foo~request-getTime', function () {
        requestPlayerStateEverySecond();
    });

    $rootScope.$on('foo~resp-joinedRoomSuccess', function (ev, data) {
        // console.log(data);
        $rootScope.joinedRoom = data.roomId;
        $rootScope.$emit('resp-joinedRoomSuccess',data);
    });

    $rootScope.$on('socket-joinRoom', function (ev, data) {
        // console.log('joined room' + data.idx);
        // console.log(data);
        socket.emit('socket-joinRoom', {idx: data.idx});
    });

    $rootScope.$on('foo~resp-sentChat', function (ev, data) {
        $rootScope.$emit('resp-sentChat', data);
    });

    $rootScope.$on('socket-sentChat', function (ev, data) {
        // console.log(data);
        socket.emit('socket-sentChat',  data);
    });

    $rootScope.$on('socket-videoPlayed', function(event, data) {
        var sendData = angular.extend(data,{room: $rootScope.joinedRoom});
        // console.log(data);

        if ($rootScope.joinedRoom === $rootScope.currentSocketId || $rootScope.joinedRoom === '') {
            socket.emit('socket-videoPlayed', JSON.stringify(sendData));
        }

        if ($rootScope.joinedRoom !== '') {
            if (angular.element(document.getElementsByClassName('main-video')).is(':visible')) {
                // Handling from $rootScope.showChatArea2 = true;
            } else {
                $rootScope.showChatArea1 = true;
            }
        }

    });

    $rootScope.$on('leaveRoom', function() {
        if ($rootScope.joinedRoom !== $rootScope.currentSocketId && $rootScope.joinedRoom !== '') {
            $rootScope.showChatArea2 = false;
            $rootScope.showChatArea1 = false;
            socket.emit('socket-leaveRoom', JSON.stringify({socket:$rootScope.currentSocketId,room:$rootScope.joinedRoom}));
            $rootScope.joinedRoom = '';
        }
    });

    $rootScope.$on('socket-videoStatusUpdate', function(event, data) {
        var sendData = angular.extend(data,{room: $rootScope.joinedRoom, title:window.player.getVideoData().title});
        socket.emit('socket-videoStatusUpdate',  sendData);
    });

    return socket;
}]);