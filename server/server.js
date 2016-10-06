const cluster = require('cluster');

if (cluster.isMaster) {
    const config  = require(__dirname + '/config/app'),
        redisConfig  = require(__dirname + '/config/redis');
    const num_processes = (config.debug)?1:require('os').cpus().length;
    const roomList = require(__dirname+'/config/rooms');
    var workers = [];
    var spawn = function(i) {
        workers[i] = cluster.fork();
        workers[i].on('exit', function(code, signal) { spawn(i); });
    };

    var redisClient = require('redis').createClient(redisConfig.port, redisConfig.host);
    for (var r in roomList) { redisClient.del(r); }

    // Spawn processes
    for (var i = 0; i < num_processes; i++) { spawn(i); }
   
    var worker_index = function(ip, len) {
        var s = '';
        for (var i = 0; i < ip.length; i++) {
            if (!isNaN(ip[i])) { s += ip[i]; }
        }
        return Number(s) % len;
    };

    var server = require('net').createServer({ pauseOnConnect: true }, function(connection) {
        var worker = workers[worker_index(connection.remoteAddress, num_processes)];
        worker.send('sticky-session:connection', connection);
    }).listen(config.port, '0.0.0.0');
} else {
    var app = require(__dirname+'/app.js');
    var server = app.listen(0, 'localhost');
    require('./socketEvents')(server);
    process.on('message', function(message, connection) {
        if (message !== 'sticky-session:connection') { return; }
        server.emit('connection', connection);
        connection.resume();
    });
}