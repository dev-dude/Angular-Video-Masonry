/* global io */

// Determine what room the video status update is in because they are all going to the server
// -- aka get all the user in a room for a request and broadcast to all of them instantly.
// need to send room with all requests


'use strict';

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var geoip =  require("geoip-native");
global.intervalSet = true;
var watchingUsers = [],
    userNames = [],
    joinedRooms = [];

app.get('/', function (req, res) {
    res.sendFile('index.html');
});



app.get('/ipLookUp/:ipSend', function (req, res) {
    var geoIpResult;
    res.setHeader('cache-control', 'max-age=0');
    res.setHeader('Content-Type', 'application/json');
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('IPLOOKUP:' + ip);
    if (req.params.hasOwnProperty('ipSend') && ip) {
        console.log('checkIP');
        geoIpResult = geoip.lookup(ip);
        console.log(geoIpResult);
        res.send(geoIpResult);
    } else {
        res.send('{}');
    }

});

function findClientsSocket(roomId) {
    var sendArray = [];
    var clients_in_the_room = io.sockets.adapter.rooms[roomId];
    for (var clientId in clients_in_the_room) {
        // console.log('client: %s', clientId); //Seeing is believing
        // var client_socket = io.sockets.connected[clientId];//Do whatever you want with this
        sendArray.push({user: clientId});
    }
    return sendArray;
}

function findIndex(array, key, value, replace) {
    var i;
    for (i = 0; i < array.length; i++) {
        if (array[i].hasOwnProperty(key) && array[i][key] === value) {
            return i;
        }
    }
    return -1;
}

io.on('connection', function (socket) {

    var waitForFinalEvent = (function () {
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

    socket.emit('resp-clientId', { clientId: socket.id });

    socket.on('socket-videoPlayed', function (data) {
        console.log(socket.id);
        data = JSON.parse(data);

        console.log(data);

        var index = findIndex(userNames, 'idx', socket.id);

        if (index !== -1) {
            userNames[index] = {idx: socket.id, videoId: data.videoId, title: data.data.title};
            // Emit to JUST THE USER to set their socket id
        } else {
            userNames.push({idx: socket.id, videoId: data.videoId, title: data.data.title});
            // the user new user has joined video page
        }


        //userNames[socket.id] = {user: socket.id, videoId: data.videoId};
        console.log(userNames);

        console.log('********* Watching Users: **********');
        console.log(socket.id);
        socket.to(socket.id).emit('resp-videoStatus', data);

    });

    socket.on('socket-videoStatusUpdate', function (data) {
        var index = findIndex(userNames, 'idx', socket.id);
        console.log(index);
        if (index !== -1) {
            userNames[index].status = data.status;
            userNames[index].time = data.time;
        }

        console.log('********* Video Status **********');
        console.log(data.status);
        console.log(socket.id);
        console.log(data.videoId);
        // Emit to all People in your room realtime
        socket.to(socket.id).emit('resp-videoStatus', data);
    });
    socket.on('socket-joinRoom', function (room) {
        var index;
        console.log('joinRoom' + room.idx);
        console.log(room.idx);

        socket.join(room.idx);
        console.log('ROOMS');
        console.log(socket.rooms);

        //TODO: On Join Emit to all People in the room realtime
        index = findIndex(userNames, 'idx', room.idx);
        // Get Time for
        socket.to(room.idx).emit('request-getTime');

        console.log('usersInRoom');
        // Add user to room Array
        joinedRooms.push({'idx':socket.id,room: room.idx});
        io.sockets.in(room.idx).emit('resp-userInRoom', JSON.stringify({room:room.idx, users: findClientsSocket(room.idx)}));
        socket.emit('resp-joinedRoomSuccess', {roomId: room.idx, data: userNames[index]});
    });

    socket.on('disconnect', function () {
        var currentIndex = findIndex(joinedRooms, 'idx', socket.id),
            room;
        console.log('The client has disconnected!');
        userNames.splice(findIndex(userNames, 'idx', socket.id), 1);
        if (currentIndex !== -1) {
            room = joinedRooms[currentIndex].room;
            io.sockets.in(room).emit('resp-userInRoom', JSON.stringify({room: room, users: findClientsSocket(room)}));
            joinedRooms.splice(currentIndex, 1);
        }
    });

    socket.on('socket-sentChat', function (data) {
        io.sockets.in(data.room).emit('resp-sentChat',data);
    });

    socket.on('socket-leaveRoom', function (data) {
        console.log('LEAVE ROOM COMMAND');
        var newData = JSON.parse(data);
        console.log(newData);
        socket.leave(newData.room);
        io.sockets.in(newData.room).emit('resp-userInRoom', JSON.stringify({userLeft:true, room:newData.room, users: findClientsSocket(newData.room)}));
    });

    waitForFinalEvent(function () {
        console.log('INTERVAL');
        if (global.intervalSet) {
            console.log('intervalset');
            setInterval(function () {

                for (var i = 0; i < userNames.length; i++) {
                    var arrayOfClients = findClientsSocket(userNames[i].idx);
                    userNames[i].pplInRoom = arrayOfClients.length;
                    if (userNames[i].hasOwnProperty('time') && userNames[i].hasOwnProperty('status') && userNames[i].status === 'Playing...') {
                        // console.log(userNames[i].time);
                        // console.log(parseInt(userNames[i].time) + 1);
                        userNames[i].time = Math.floor(parseInt(userNames[i].time) + 1.4);
                    }
                }
                io.sockets.emit('resp-currentUsers', JSON.stringify(userNames));
            }, 3000);
            global.intervalSet = false;
        }
    }, 1000, '123xvv');

});

http.listen(3000, function () {
    console.log('listening on *:3000');
});
