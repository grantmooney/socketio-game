const CANVAS_CONTAINER_ID = "gameplay",
    SCREEN_WIDTH = 640,
    SCREEN_HEIGHT = 480,
    CAMERA_MOVE_PADDING = 0.4,
    GUI_FONT = {font:"16px Arial", fill: "#fff", align: "left"};

var game = new Phaser.Game(SCREEN_WIDTH, SCREEN_HEIGHT, Phaser.AUTO, CANVAS_CONTAINER_ID, { init: init, preload: preload, create: create, update: update, render: render});
var players = {};
var moveInput = {up: false, down: false, left:false, right: false};
var depthGroup,
    map, 
    layers = {};
var chat = {
    active: false,
    inputText: null,
    messagesText: null
};

function init() {
    game.renderer.renderSession.roundPixels = true;
    game.stage.disableVisibilityChange = true;
    game.time.advancedTiming = true;
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

    // Tile collisions
    map.setCollision([1,2,4], true, 'Walls', true);

    // Physics
    game.physics.startSystem(Phaser.Physics.ARCADE);

    // Groups
    depthGroup = game.add.group();

    // GUI
    chat.messagesText = game.add.text(0, 0, "Press \"Enter\" to type.", GUI_FONT);
    chat.messagesText.setTextBounds(10, SCREEN_HEIGHT/2, SCREEN_WIDTH/2, SCREEN_HEIGHT/2-30); // bottom-left corner
    chat.messagesText.fixedToCamera = true;
    chat.messagesText.boundsAlignV = "bottom";

    chat.inputText = game.add.text(0, 0, "", GUI_FONT);
    chat.inputText.setTextBounds(10, SCREEN_HEIGHT/2, SCREEN_WIDTH/2, SCREEN_HEIGHT/2-10); // bottom-left corner
    chat.inputText.fixedToCamera = true;
    chat.inputText.boundsAlignV = "bottom";

    // Connection
    this.client = new Client();
    this.client.connect(window.Auth.url);

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
        if (chat.active) {
            if ( keyboardEvent.code == "Enter" ) {
                chat.active = false;            
                this.client.sendRoomMessage(chat.inputText.text);
                chat.inputText.text = "";
            } else if (keyboardEvent.code == "Backspace") {
                chat.inputText.text = chat.inputText.text.substring(0, chat.inputText.text.length-1);
            } else if ('key' in keyboardEvent && (keyboardEvent.key.length == 1)) {
                chat.inputText.text += keyboardEvent.key;
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
                    chat.active = true;
                    break;
            }
            if (change) {
                var moveAxis = {
                    x: ((moveInput.right)?1:((moveInput.left)?-1:0)),
                    y: ((moveInput.down)?1:((moveInput.up)?-1:0)),
                };
                this.client.getPlayer().setMovement(moveAxis);
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
                x: ((moveInput.right)?1:((moveInput.left)?-1:0)),
                y: ((moveInput.down)?1:((moveInput.up)?-1:0)),
            };
            this.client.getPlayer().setMovement(moveAxis);
        }
    }
}

// player prototype
function Player(playerID, position, client) {
    const self = this,
        speed = 90;
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
        game.camera.deadzone = new Phaser.Rectangle (SCREEN_WIDTH*CAMERA_MOVE_PADDING, SCREEN_HEIGHT*CAMERA_MOVE_PADDING, SCREEN_WIDTH*(1-2*CAMERA_MOVE_PADDING), SCREEN_HEIGHT*(1-2*CAMERA_MOVE_PADDING));
    } else {
        this.sprite.alpha = 0.8;
    }
    this.setPosition = function(pos) { this.sprite.position = pos; }
    this.setMovement = function(inputAxis) {
        self.setVelocity({x: inputAxis.x*speed, y: inputAxis.y*speed});
        if (this.isClient) {
            client.socket.emit('move', {p: self.sprite.position, ia: inputAxis });
            lastSync = game.time.totalElapsedSeconds();
        }
    }
    this.setVelocity = function(velocity) {
        self.velocity = velocity;
        self.sprite.body.velocity.x = self.velocity.x;
        self.sprite.body.velocity.y = self.velocity.y;
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
    this.room = null;
    this.socket = null;
    this.status = 'Loading...';
    this.inRoom = function() { return (self.room != null); };
    this.connect = function(url) {
        this.status = 'connecting...\n';
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
        self.joinRoom('noob_island');
        self.id = self.socket.io.engine.id;
        if (!self.id.startsWith("/#")) { self.id = "/#"+self.id; }
    };
    this.onUnauthorized = function(msg) { throw new Error(msg.data.type); };
    this.onJoinedRoom = function(data) {
        console.log(data);
        for (var id in data.players) {
            players[id] = new Player(id, JSON.parse(data.players[id]), self);
        }
        self.room = data.room;
        self.status = 'Room: '+data.room+'\n';
    };
    this.onPlayerJoinedRoom = function(player) {
        if (self.inRoom()) {
            players[player.id] = new Player(player.id, player.pos, self);
        }
    };
    this.onPlayerMoving = function(data) {
        if (self.inRoom()) {
            players[data.id].setPosition(data.p);
            players[data.id].setMovement(data.ia);
        }
    };
    this.onPlayerSentRoomMessage = function(data) {
        if (self.inRoom()) {
            console.log(data);
            chat.messagesText.text += "\n<"+data.name+"> "+data.msg;
            // players[data.id].setPosition(data.pos);
        }
    }
    this.onPlayerUpdatePosition = function(data) {
        if (self.inRoom()) {
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
        self.room = null;
        // Destory players
        for (var p in players) { if (players.hasOwnProperty(p)) { players[p].sprite.destroy(true); delete players[p]; } }
        self.status = 'Disconnected\n';
    };

    this.joinRoom = function(room) {
        self.socket.emit('join_room', {room:room, pos: {x: 64, y: 64}});
        self.status = 'Joining room...\n';
    }
    this.sendRoomMessage = function(message) {
        chat.messagesText.text += "\n<"+window.Auth.user.first_name+"> "+message;
        if (message.length > 0) {
            self.socket.emit('send_room_message', message);
        }
    }
    this.getPlayer = function(){ return players[self.id]; };
}