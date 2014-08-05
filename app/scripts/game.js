function Game (world) {
	
	var world = world;
 	var players = {};
	var gui = new GUI();

	var started = false;

	var _this = this;
	var input = new Input(this, {
    padNotSupported: function (padType) {
    	if (padType == Phonepad.PAD_TYPES.gamepad) {
    		$('#gamepads').addClass('notCompatible');
    	} else if (padType == Phonepad.PAD_TYPES.phonepad) {
    		$('#phonepads').addClass('notCompatible');
    	}
    },

    connected: function (gameId) {
    	$('.gameId').html(gameId);
    },

    playerConnected: function (playerId, padType) {
    	if (_this.loaded && players[playerId] == null) {
    		addPlayer(playerId);
    	}
    },

    playerDisconnected: function (playerId) {
    	removePlayer(playerId);
    },

    commandsReceived: function (commands) {
    	var player = players[commands.pId];
    	if (player) {
				player.commands = commands;
			}
    }
	});

	var addPlayer = function (playerId) {
		var player = Physics.body('player', {
	    id: playerId,
	    team: Object.keys(players).length % 4,
	    viewport: world._renderer.renderer
	  });
		players[player.id] = player;
	  var playerBehavior = Physics.behavior('player-behavior', { player: player });
		world.add([player, playerBehavior]);
		player.animateRepop();
		gui.addPlayer(player);
	};

	var removePlayer = function (playerId) {
		var player = players[playerId];
		if (player.buff) {
			player.buff.destroy();
		}
		world.emit('removeBody', player);
		gui.removePlayer(playerId);
		delete players[playerId];
		var n = 0;
		for (var i in players) {
			var player = players[i];
			player.updateTeam(n % 4);
			n++;
		}
	};

	var popBox = function () {
		if (Math.random() < 0.006) {
			var element = Physics.body('box', {
		    x: (world._renderer.renderer.width + 550 * (2 * Math.random() - 1)) / 2,
		    y: 0
		  });
			world.add(element);
		}
	};

	this.loaded = false;

	this.onLoaded = function () {
		_this.loaded = true;
		gui.hideLoading();
	}

	this.update = function () {
		popBox();
		input.update(players);
	};

	this.checkVictory = function () {
		if (started) {
			// check if game over
			var playersAlive = [];
			for (var i in players) {
				var player = players[i];
				if (player.life > 0) {
					if (playersAlive.length > 0) return;

					playersAlive.push(player);
				}
			}
			gui.showVictory(playersAlive[0]);
		} else {
			for (var i in players) {
				var player = players[i];
				player.life = 3;
			}
		}
	};

	this.start = function () {
		started = true;
		for (var i in players) {
			var player = players[i];
			player.setEnabled(false);
			player.reset(true);
		}
		$('#gameIdInGame').removeClass('hide');
		$('#victory').addClass('hide');
		$('#instructions').addClass('hide');
		gui.showRoundStart(function () {
			for (var i in players) {
			var player = players[i];
			player.setEnabled(true);
		}
		});
	};

	this.updateGUI = function (data) {
		switch(data.type) {
			case 'life':
				if (started) {
					gui.updateLife(data.target);
				}
				break;
			case 'team':
				gui.updateTeam(data.target);
				break;
			case 'damage':
				gui.updateDamage(data.target);
				break;
			case 'item_add':
				gui.addItem(data.target);
				break;
			case 'item_remove':
				gui.removeItem(data.target);
				break;
			case 'item_update':
				gui.updateItem(data.target);
				break;
		}
	};

}

Game.CHARACTERS = ['tomato', 'lemon'];
