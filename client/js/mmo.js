const SOCKET_URL = location.hostname,
    CANVAS_CONTAINER_ID = "gameplay",
    w = 640,
    h = 480,
    CAMERA_PADDING = 0.4,
    GUI_FONT = {font:"12px Arial", fill: "#fff", align: "left"},
    GRID_WIDTH = 1920,
    GRID_HEIGHT = 1920,
    PLAYER_SPEED = 90,
    FPS = 30;

var game = new Phaser.Game(w, h, Phaser.AUTO, CANVAS_CONTAINER_ID, { init: init, preload: preload, create: create, update: update, render: render});
var players = {};
var moveInput = {up: false, down: false, left:false, right: false},
    sendingMessage = false;
var inputText, messagesText;
var depthGroup,
    map, 
    layers = {};

function init() {
    game.renderer.renderSession.roundPixels = true;
    game.stage.disableVisibilityChange = true;
    game.time.advancedTiming = true;
    game.time.desiredFps = FPS;
}

function preload() {
    game.load.image("player", "assets/player.png");
    game.load.image("ground", "assets/tiles/ground.png");
    game.load.tilemap('noob_island', 'assets/rooms/noob_island.json', null, Phaser.Tilemap.TILED_JSON);
}

function create() {
    // Canvas settings
    this.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    
    // Map
    map = game.add.tilemap('noob_island');
    map.addTilesetImage('ground');

    // Layers
    layers.ground = map.createLayer('Ground');
    layers.walls = map.createLayer('Walls');
    layers.ground.resizeWorld();

    // Tile collisions & pathfinding
    var badTiles = [1,99];
    map.setCollision(badTiles, true, 'Walls', true);

    // Physics
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // Groups
    depthGroup = game.add.group();

    // GUI
    messagesText = game.add.text(0, 0, "Press \"Enter\" to type.", GUI_FONT);
    messagesText.setTextBounds(10, h/2, w/2, h/2-30); // bottom-left corner
    messagesText.fixedToCamera = true;
    messagesText.boundsAlignV = "bottom";

    inputText = game.add.text(0, 0, "", GUI_FONT);
    inputText.setTextBounds(10, h/2, w/2, h/2-10); // bottom-left corner
    inputText.fixedToCamera = true;
    inputText.boundsAlignV = "bottom";

    // Connection
    this.client = new Client();
    this.client.connect(SOCKET_URL);

    // Input
    game.input.keyboard.addCallbacks(this, keyDown, keyUp, null);
}

function update() { 
    if (this.client.inRoom) {
        for (var id in players) { players[id].update(); }
    }
    depthGroup.sort('y', Phaser.Group.SORT_ASCENDING);
}

function render() {
    game.debug.text(this.client.status, 10, 20);
    game.debug.text('FPS: '+game.time.fps, 10, 40);
}

function keyDown (keyboardEvent) {
    if (this.client.inRoom) {
        if (sendingMessage) {
            if ( keyboardEvent.code == "Enter" ) {
                sendingMessage = false;
                console.log(inputText.text);
                inputText.text = "";
            } else if (keyboardEvent.code == "Backspace") {
                inputText.text = inputText.text.substring(0, inputText.text.length-1);
            } else if ('key' in keyboardEvent && (keyboardEvent.key.length == 1)) {

                console.log(keyboardEvent);
                inputText.text += keyboardEvent.key;
            }
        } else {
            var change = false;
            switch (keyboardEvent.code) {
                case 'ArrowUp':
                case 'KeyW':
                    if (!moveInput.up) {
                        moveInput.up = true;
                        change = true;
                    }
                    break;
                case 'ArrowLeft':
                case 'KeyA':
                    if (!moveInput.left) {
                        moveInput.left = true;
                        change = true;
                    }
                    break;
                case 'ArrowDown':
                case 'KeyS':
                    if (!moveInput.down) {
                        moveInput.down = true;
                        change = true;
                    }
                    break;
                case 'ArrowRight':
                case 'KeyD':
                    if (!moveInput.right) {
                        moveInput.right = true;
                        change = true;
                    }
                    break;
                case "Enter":
                    sendingMessage = true;
                    break;
            }
            if (change) {
                var moveAxis = {
                    x: PLAYER_SPEED * ((moveInput.right)?1:((moveInput.left)?-1:0)),
                    y: PLAYER_SPEED * ((moveInput.down)?1:((moveInput.up)?-1:0)),
                };
                this.client.getPlayer().setVelocity(moveAxis);
            }
        }
    }
}

function keyUp (keyboardEvent) {
    if (this.client.inRoom) {
        var change = false;
        switch (keyboardEvent.code) {
            case 'ArrowUp':
            case 'KeyW':
                if (moveInput.up) {
                    moveInput.up = false;
                    change = true;
                }
                break;
            case 'ArrowLeft':
            case 'KeyA':
                if (moveInput.left) {
                    moveInput.left = false;
                    change = true;
                }
                break;
            case 'ArrowDown':
            case 'KeyS':
                if (moveInput.down) {
                    moveInput.down = false;
                    change = true;
                }
                break;
            case 'ArrowRight':
            case 'KeyD':
                if (moveInput.right) {
                    moveInput.right = false;
                    change = true;
                }
                break;
        }
        if (change) {
            var moveAxis = {
                x: PLAYER_SPEED * ((moveInput.right)?1:((moveInput.left)?-1:0)),
                y: PLAYER_SPEED * ((moveInput.down)?1:((moveInput.up)?-1:0)),
            };
            this.client.getPlayer().setVelocity(moveAxis);
        }
    }
}

// player prototype
function Player(playerID, position, client) {
    var self = this;
    var client = client,
        lastSync = 0;
    this.id = playerID;
    this.velocity = {x:0,y:0};
    this.sprite = depthGroup.create(position.x, position.y, "player");
    this.sprite.anchor.setTo(.5,.9);
    this.isClient = this.id == client.id;
    game.physics.enable(this.sprite);
    if (this.isClient) { 
        game.camera.follow(this.sprite, Phaser.Camera.FOLLOW_LOCKON, 0.1, 0.1);
        game.camera.deadzone = new Phaser.Rectangle (w*CAMERA_PADDING, h*CAMERA_PADDING, w*(1-2*CAMERA_PADDING), h*(1-2*CAMERA_PADDING));
    } else {
        this.sprite.alpha = 0.8;
    }
    this.setPosition = function(pos) { this.sprite.position = pos; }
    this.setVelocity = function(velocity) {
        self.velocity = velocity;
        self.sprite.body.velocity.x = self.velocity.x;
        self.sprite.body.velocity.y = self.velocity.y;
        if (this.isClient) {
            client.socket.emit('move', {p: self.sprite.position, v: velocity });
            lastSync = game.time.totalElapsedSeconds();
        }
    }
    this.update = function() {
        self.sprite.body.velocity.x = self.velocity.x;
        self.sprite.body.velocity.y = self.velocity.y;
        game.physics.arcade.collide(this.sprite, layers.walls);
        if (this.isClient) {
            if (game.time.totalElapsedSeconds() - lastSync > 10) {
                client.socket.emit('update_position', {pos: this.sprite.position});
                lastSync = game.time.totalElapsedSeconds();
            }
        }
    }
}

// client prototype
function Client() {
    var self = this;
    this.id = null;
    this.inRoom = false;
    this.socket = null;   
    this.status = 'connecting...\n';
    this.connect = function(url) {
        this.socket = io.connect(url, { autoConnect: true});
        this.socket.on('connect', this.onConnect);
        this.socket.on('authenticated', this.onAuthenticated);
        this.socket.on('unauthorized', this.onUnauthorized);
        this.socket.on('joined_room', this.onJoinedRoom);
        this.socket.on('player_joined_room', this.onPlayerJoinedRoom);
        this.socket.on('player_moving', this.onPlayerMoving);
        this.socket.on('player_sent_room_message', this.onPlayerSentRoomMessage);
        this.socket.on('player_update_position', this.onPlayerUpdatePosition);
        this.socket.on('player_left_room', this.onPlayerLeftRoom);
        this.socket.on('player_disconnected', this.onPlayerDisconnected);
        this.socket.on('disconnect', this.onDisconnect);
    }
    this.onConnect = function() {
        self.status = 'Authenticating...\n';
        self.socket.emit('authenticate', { token: window.Auth.token });
    };
    this.onAuthenticated = function() {
        self.socket.emit('join_room', {room:'noob_island', pos: {x: 64, y: 64}});
        self.status = 'Joining room...\n';
        self.id = self.socket.io.engine.id;
        if (!self.id.startsWith("/#")) { self.id = "/#"+self.id; }
    };
    this.onUnauthorized = function(msg) { throw new Error(msg.data.type); };
    this.onJoinedRoom = function(data) {
        console.log(data);
        for (var id in data.players) {
            players[id] = new Player(id, JSON.parse(data.players[id]), self);
        }
        self.inRoom = true;
        self.status = 'World: '+data.room+'\n';
    };
    this.onPlayerJoinedRoom = function(player) {
        if (self.inRoom) {
            players[player.id] = new Player(player.id, player.pos, self);
        }
    };
    this.onPlayerMoving = function(data) {
        if (self.inRoom) {
            players[data.id].setPosition(data.p);
            players[data.id].setVelocity(data.v);
        }
    };
    this.onPlayerSentRoomMessage = function(data) {
        if (self.inRoom) {
            console.log(data);
            // players[data.id].setPosition(data.pos);
        }
    }
    this.onPlayerUpdatePosition = function(data) {
        if (self.inRoom) {
            console.log(data);
            players[data.id].setPosition(data.pos);
        }
    }
    this.onPlayerLeftRoom = function(cid) {
        if (cid in players) {
            players[cid].sprite.destroy(true);
            delete players[cid];
        }
    };
    this.onPlayerDisconnected = function(cid) {
        if (cid in players) {
            players[cid].sprite.destroy(true);
            delete players[cid];
        }
    };
    this.onDisconnect = function() {
        self.inRoom = false;
        self.status = 'Disconnected';
        // Destory players
        for (var p in players) { if (players.hasOwnProperty(p)) { players[p].sprite.destroy(true); delete players[p]; } }
        status = 'disconnected\n';
    };

    this.getPlayer = function(){ return players[self.id]; };
}