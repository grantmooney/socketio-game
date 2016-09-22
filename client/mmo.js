const SERVER_URL = location.hostname+':8080',
    w = 800,
    h = 600,
    GRID_WIDTH = 1024,
    GRID_HEIGHT = 1024,
    GRID_TILE_SIZE = 64,
    GRID_HALF = GRID_TILE_SIZE/2,
    START_POS = {x: 1, y: 1};

var PLAYER_SPEED = 0.2;

var myText = null;
var game = new Phaser.Game(w, h, Phaser.AUTO, 'game', { init: init, preload: preload, create: create, update: update, render: render});

function init() {
    game.renderer.renderSession.roundPixels = true;
    game.stage.disableVisibilityChange = true;
}

function preload() {
    // game.load.baseURL = '/';
    // game.load.crossOrigin = 'anonymous';
    game.load.image("player", "assets/player.png");
}

function create() {
    // Physics
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // Connection
    this.client = new Client();
    this.client.connect(SERVER_URL);
    myText = game.add.text(0, 0, "started (not yet connected)", { font: "14px Arial", fill: "#ff0044"});
    
    // Input
    game.input.onTap.add(onTap, this);
}

function update() { 
    if (this.client.joined) {
        // for (p in this.client.players) {
        //     var player = this.client.players[p];
        //     if (game.physics.arcade.distanceToXY(player.sprite, player.pos.x, player.pos.y) > 1) {
        //         game.physics.arcade.moveToXY(player.sprite, player.pos.x, player.pos.y, 0, 1000);
        //     } else {
        //         player.sprite.body.velocity.set(0);
        //     }
        // }
    }
}

function render() { /* render */ }

function onTap(pointer) {
    if (this.client.joined) {
        this.client.moveMainPlayer({x: pointer.clientX, y:pointer.clientY});
    }
}

// player prototype
function Player(id, pos) {
    this.id = id;
    this.pos = pos;
    this.sprite = game.add.sprite(pos.x, pos.y, "player");
    game.physics.enable(this.sprite, Phaser.Physics.ARCADE);
    this.sprite.anchor.setTo(0.5,0.5);
}

// client prototype
function Client() {
    $this = this;
    this.socket = null;
    this.id = null;
    this.connected = false;
    this.joined = false;
    this.players = {};
    this.connect = function(url) {
        $this.socket = io.connect(url, { autoConnect: true});
        $this.socket.on('connect', this.onConnect);
        $this.socket.on('list_players', this.onListPlayers);
        $this.socket.on('player_joined', this.onPlayerJoined);
        $this.socket.on('player_moved', this.onPlayerMoved);
        $this.socket.on('player_left', this.onPlayerLeft);
        $this.socket.on('disconnect', this.onDisconnect);
    };
    this.onConnect = function() {
        $this.connected = true;
        $this.id = $this.socket.io.engine.id;
        if (!$this.id.startsWith("/#")) { $this.id = "/#"+$this.id; }
        myText.text = 'connected\n';
        // Join/start the game
        $this.socket.emit('start', { pos: JSON.stringify(START_POS) } );
    };
    this.onListPlayers = function(positions) {
        for (var id in positions) {
            $this.players[id] = new Player(id, gridToWorldPos(JSON.parse(positions[id])));
        }
        $this.joined = true;
    };
    this.onPlayerJoined = function(client) {
        if ($this.joined) {
            $this.players[client.id] = new Player(client.id, gridToWorldPos(JSON.parse(client.pos)));
        }
    };
    this.onPlayerMoved = function(move) {
        if ($this.joined) {
            if ($this.players[move.id].tween) { $this.players[move.id].tween.stop(true); }
            var t = pointDistance(move.pos,$this.players[move.id].sprite.position)/PLAYER_SPEED;
            $this.players[move.id].tween = game.add.tween($this.players[move.id].sprite).to( move.pos, t, Phaser.Linear, true);
            $this.players[move.id].pos = move.pos;
        }
    };
    this.onPlayerLeft = function(cid) {
        if ($this.joined) {
            $this.players[cid].sprite.destroy(true);
            delete $this.players[cid];
        }
    };
    this.onDisconnect = function() {
        $this.connected = false;
        $this.loaded = false;
        for (var prop in $this.players) { if ($this.players.hasOwnProperty(prop)) { $this.players[prop].sprite.destroy(true); delete $this.players[prop]; } }
        myText.text = 'disconnected\n';
    };
    this.getMainPlayer = function(){
        return $this.players[$this.id];
    };
    this.moveMainPlayer = function(pos) {
        if ($this.joined && ($this.players[$this.id].pos.x != pos.x) && ($this.players[$this.id].pos.y != pos.y)) {
            var p1 = worldToGridPos(pos),
                p2 = worldToGridPos($this.players[$this.id].pos);
            if (p1.x != p2.x || p1.y != p2.y) {
                $this.socket.emit('grid_move', JSON.stringify(p1));
            }
            $this.socket.emit('move', pos);
            if ($this.players[$this.id].tween) { $this.players[$this.id].tween.stop(true); }
            var t = pointDistance(pos,$this.players[$this.id].sprite.position)/PLAYER_SPEED;
            $this.players[$this.id].tween = game.add.tween($this.players[$this.id].sprite).to( pos, t, Phaser.Linear, true);
            $this.players[$this.id].pos = pos;
        }
    };
}


// HELPERS
function worldToGridPos(p) {
    var x = Math.floor((p.x + GRID_HALF)/GRID_TILE_SIZE);
    var y = Math.floor((p.y + GRID_HALF)/GRID_TILE_SIZE);
    return {x:x,y:y};
}

function gridToWorldPos(p) {
    var x = (p.x * GRID_TILE_SIZE);
    var y = (p.y * GRID_TILE_SIZE);
    return {x:x,y:y};
}

function pointDistance(p1, p2) {
    return Math.sqrt( (p1.x-p2.x)*(p1.x-p2.x) + (p1.y-p2.y)*(p1.y-p2.y) );
}