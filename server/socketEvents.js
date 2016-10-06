"use strict"
const ioJwt = require('socketio-jwt');
const config  = require(__dirname + '/config/app'),
    redisConfig  = require(__dirname + '/config/redis');
const redisClient = require('redis').createClient(redisConfig.port, redisConfig.host);

const roomList = require(__dirname+'/config/rooms');

exports = module.exports = function(server) {
    var io = require('socket.io')(server);
    // Redis adapter
    io.adapter(require('socket.io-redis')({ host: redisConfig.host, port: redisConfig.port }));
    io.on('connection', ioJwt.authorize({
        secret: config.secret,
        timeout: 10000 // 10 seconds to send the authentication message
    })).on('authenticated', function(socket) {
        // Join room event
        socket.on('join_room', function(data){
            if (data.room in roomList) {
                // Leave current room
                if ('room' in socket) {
                    redisClient.hdel(socket.room, socket.id);
                    socket.broadcast.to(socket.room).emit('player_left_room', socket.id );               
                    socket.leave(socket.room);
                }
                socket.room = data.room;
                socket.join(socket.room);
                redisClient.hmset(socket.room, socket.id, JSON.stringify(data.pos));
                socket.broadcast.to(socket.room).emit('player_joined_room', { id: socket.id, user : socket.decoded_token, pos: data.pos } );
                redisClient.hgetall(socket.room, function(err, players) {
                    //console.log(players);
                    socket.emit('joined_room', { room: socket.room, players: players }); 
                });
            }
        });

        // Player target-based movement
        socket.on('move', function(data) {
            redisClient.hmset(socket.room, socket.id, JSON.stringify(data.p));
            socket.broadcast.to(socket.room).emit('player_moving', { id: socket.id, p: data.p, v: data.v } );
        });

        // Update player position
        socket.on('update_position', function(data) {
            redisClient.hmset(socket.room, socket.id, JSON.stringify(data.pos));
            socket.broadcast.to(socket.room).emit('player_update_position', { id: socket.id, pos: data.pos });
        });

        socket.on('send_room_message', function(msg){
            socket.broadcast.to(socket.room).emit('player_sent_room_message', { id: socket.id, name: socket.decoded_token.firstName, message: msg});
        });

        // Disconnect
        socket.on('disconnect', function(data) {
            if ('room' in socket) { 
                redisClient.hdel(socket.room, socket.id);
                socket.broadcast.to(socket.room).emit('player_disconnected', socket.id);
            }
        });
    });
}