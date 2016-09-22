const express = require('express'),
    cluster = require('cluster'),
    net = require('net'),
    sio = require('socket.io'),
    sio_redis = require('socket.io-redis'),
    redis = require("redis");

const port = 8080,
    num_processes = require('os').cpus().length;

var redisClient = redis.createClient(6379, 'localhost');

if (cluster.isMaster) {
    var workers = [];
    var spawn = function(i) {
        workers[i] = cluster.fork();
        workers[i].on('exit', function(code, signal) {
            console.log('respawning worker', i);
            spawn(i);
        });
    };

    redisClient.del("names");
    redisClient.del("gridPos");

    for (var i = 0; i < num_processes; i++) { spawn(i); }
    var worker_index = function(ip, len) {
        var s = '';
        for (var i = 0, _len = ip.length; i < _len; i++) {
            if (!isNaN(ip[i])) { s += ip[i]; }
        }
        return Number(s) % len;
    };

    // Create the outside facing server listening on our port.
    var server = net.createServer({ pauseOnConnect: true }, function(connection) {
        var worker = workers[worker_index(connection.remoteAddress, num_processes)];
        worker.send('sticky-session:connection', connection);
    }).listen(port, '0.0.0.0');
} else {
    var app = new express();
    var server = app.listen(0, 'localhost'),
        io = sio(server);

    io.adapter(sio_redis({ host: 'localhost', port: 6379 }));

    io.sockets.on('connection', function(socket) {
        socket.on('start', function(data) {
            socket.broadcast.emit('player_joined', {id: socket.id, pos: data.pos});
            redisClient.hmset("gridPos", socket.id, data.pos);
            redisClient.hgetall("gridPos", function(err, positions) {
                socket.emit('list_players', positions); 
            });
        });
        socket.on('move', function(pos) {
            socket.broadcast.emit('player_moved', { id: socket.id, pos: pos } );
        });
        socket.on('grid_move', function(gridPos) {
            redisClient.hset("gridPos", socket.id, gridPos);
        });
        socket.on('disconnect', function(data) {
            redisClient.hdel("gridPos", socket.id);
            socket.broadcast.emit('player_left', socket.id);
        });
    });

    process.on('message', function(message, connection) {
        if (message !== 'sticky-session:connection') { return; }
        server.emit('connection', connection);
        connection.resume();
    });
}