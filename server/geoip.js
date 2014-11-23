/* global io */

// Determine what room the video status update is in because they are all going to the server
// -- aka get all the user in a room for a request and broadcast to all of them instantly.
// need to send room with all requests


'use strict';

var app = require('express')(),
http = require('http').Server(app),
geoip =  require("geoip-native");

global.intervalSet = true;

app.get('/ipLookUp/:ipSend', function (req, res) {
    var geoIpResult;
    res.setHeader('Content-Type', 'application/json');
    if (req.params.hasOwnProperty('ipSend')) {
        geoIpResult = geoip.lookup(req.params.ipSend);
        console.log(geoIpResult);
        res.send(geoIpResult);
    } else {
        res.send('{}');
    }

});

http.listen(3001, function () {
    console.log('listening on *:3001');
});
