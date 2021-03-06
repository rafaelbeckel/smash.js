function Game( world ) {
	
	var PROBABILITY_BOX_POP = 0.006;

	var world = world,
		gui = new GUI(),
		ai = new AI( world );

 	var players = {},
 		aiPlayers = [];

	var teamScores = null;
	var started = false;
	var _this = this;

	var DEFAULT_NAMES = ['Colonel Heinz', 'Lord Bobby', 'Lemon Alisa',
	  'The Red Baron', 'Tom Boy', 'Tommy Toe', 'Lee Mon', 'Sigmund Fruit', 'Al Pacho',
	  'Mister Bean', 'Ban Anna', 'General Grape', 'Smoothie', 'Optimus Lime', 'Juicy Luke'];
	
	// initialize input
	var input = new Input( this, {
    padNotSupported: function( padType ) {
    	if ( padType == Phonepad.PAD_TYPES.gamepad ) {
    		$( '#gamepads' ).addClass( 'notCompatible' );
    	} else if ( padType == Phonepad.PAD_TYPES.phonepad ) {
    		$( '#phonepads' ).addClass( 'notCompatible' );
    	}
    },

    connected: function( gameId ) {
    	$( '.gameId' ).html( gameId );
    },

    playerConnected: function( playerId, padType ) {
    	if ( _this.loaded && players[playerId] == null ) {
    		addPlayer( playerId, padType == 10 );
    	}
    },

    playerDisconnected: function( playerId ) {
    	removePlayer( playerId );
    },

    commandsReceived: function( commands ) {
    	var player = players[commands.pId];
    	if ( player ) {
				player.commands = commands;
			}
    }
	});

  var getPlayerName = function() {
  	var names = DEFAULT_NAMES.slice(),
  		index;

  	// remove names which have been already taken
  	for ( var i in players ) {
  		index = names.indexOf( players[i].name );
  		if ( index >= 0 ) {
  			names.splice( index, 1 );
  		}
  	}

  	if ( names.length > 0 ) {
    	return names[parseInt( Math.random() * names.length )];
  	} else {
  		return DEFAULT_NAMES[parseInt( Math.random() * DEFAULT_NAMES.length )] + ' IV';
  	}
  };

  var getPlayerTeam = function() {
  	// count number of players per team
  	var teams = [];
  	for ( var i = 0 ; i < world.map.teams; i++ ) {
  		teams[i] = 0;
  	}
  	for ( var i in players ) {
  		if ( players[i].team < teams.length ) { // used when switching between game modes
  			teams[players[i].team]++;
  		}
  	}
  	return teams.indexOf( Math.min.apply( Math, teams ) );
  };

	var addPlayer = function( playerId, AILevel ) {
		var player = Physics.body( 'player', {
	    id: playerId,
	    name: getPlayerName(),
	    team: getPlayerTeam(),
	    life: world.map.life,
	    AI: AILevel
	  });
	  _this.repopPlayer( player );
		players[player.id] = player;
	  var playerBehavior = Physics.behavior( 'player-behavior', { player: player } );
		world.add( [player, playerBehavior] );
		player.animateRepop();
		gui.addPlayer( player );
		if ( AILevel ) {
			aiPlayers.push( player );
		}
	};

	var removePlayer = function( playerId ) {
		var player = players[playerId];
		if ( player.buff ) {
			player.buff.destroy();
		}
		world.emit( 'removeBody', player );
		gui.removePlayer( playerId );
		delete players[playerId];
		if ( player.AI ) {
			aiPlayers.splice( aiPlayers.indexOf( player ), 1 );
		}
	};

	var popBox = function() {
		if ( Math.random() < PROBABILITY_BOX_POP ) {
			var element = Physics.body( 'box', {
		    x: ( world._renderer.renderer.width + world.map.width * ( 2 * Math.random() - 1 ) ) / 2,
		    y: 0
		  });
			world.add( element );
		}
	};

	this.loaded = false;

	/**
	*
	*		PUBLIC METHODS
	*
	*/

	this.repopPlayer = function( player ) {
		var viewport = world._renderer.renderer,
			randomZone = world.map.width,
			extra = 0;

		if ( world.map.id == Map.Types.FLAG.id ) {
			// restrict to a particular randomZone depending on the team
			randomZone /= 2;
			extra = ( 2 * player.team - 1 ) * world.map.width / 4;
		}
		player.state.pos.set( ( viewport.width + randomZone * ( 2 * Math.random() - 1 ) ) / 2 + extra,
			Math.random() < 0.5 ? viewport.height / 2 - 50 : viewport.height / 2 + 105 );
	};

	this.onLoaded = function() {
		_this.loaded = true;
		gui.hideLoading();

	  // init AI
	  ai.init();
	};

	this.checkVictory = function( dead ) {
		if ( started ) {
			// add frags
			if ( dead.lastHit && dead.lastHit != dead.id ) {
				var player;
				for ( var i in players ) {
					player = players[i];
					if ( player.id == dead.lastHit ) {
						player.frags++;
						gui.updateFrags( player );
						break;
					}
				}
			}

			if ( world.map.id == Map.Types.STANDARD.id ) {
				// check if game over
				var playersAlive = [],
					player;

				for ( var i in players ) {
					player = players[i];
					if ( player.life > 0 ) {
						if ( playersAlive.length > 0 ) return;

						playersAlive.push( player );
					}
				}
				gui.showVictory( playersAlive[0].name, playersAlive[0].team );
				started = false;
			}
		} else {
			var player;
			for ( var i in players ) {
				player = players[i];
				player.life = world.map.life;
			}
		}
	};

	this.start = function() {

		started = true;
		gui.init( world.map );
		teamScores = [];

		// reset scores
		for ( var i = 0; i < world.map.teams; i++ ) {
			teamScores[i] = 0;
		}

		// reset players
		for ( var i in players ) {
			var player = players[i];
			player.reset( true );
			player.setActive( false );
		}

		// reset flags positions
		for ( var i in world._bodies ) {
			if ( world._bodies[i].gameType === 'flag' ) {
				world._bodies[i].reset();
			}
		}

		$( '#gameIdInGame' ).removeClass( 'hide' );
		$( '#victory' ).addClass( 'hide' );
		$( '#instructions' ).addClass( 'hide' );
		gui.showRoundStart(function () {
			var player;
			for ( var i in players ) {
				player = players[i];
				player.setActive( true );
			}
		});
	};

	this.update = function() {
		popBox();
		input.update( players );
		ai.update( aiPlayers );
	};

	this.updateGUI = function( data ) {
		switch( data.type ) {
			case 'life':
				if ( started && world.map.id != Map.Types.FLAG.id ) {
					gui.updateLife( data.target );
				}
				break;
			case 'team':
				gui.updateTeam( data.target );
				break;
			case 'damage':
				gui.updateDamage( data.target );
				break;
			case 'item_add':
				gui.addItem( data.target );
				break;
			case 'item_remove':
				gui.removeItem( data.target );
				break;
			case 'item_update':
				gui.updateItem( data.target );
				break;
			case 'frags':
				gui.updateFrags( data.target );
				break;
		}
	};

	this.winPoints = function( team ) {
		if ( started ) {
			teamScores[team]++;

			gui.updateTeamScore(team, teamScores[team]);

			if (teamScores[team] == 3) {
				gui.showVictory('Team ' + (team + 1), team);
				started = false;
			}
		}
	};

	this.reset = function () {
		teamScores = null;
		var player;
		for ( var i in players ) {
			player = players[i];
			if ( player.team >= world.map.teams ) {
				player.team = getPlayerTeam();
				gui.updateTeam( player );
			}
			
			world.add( player );
			renderer.stage.addChild( player.view );
			player.initialLife = world.map.life;
			gui.updateInitialLife( player );
			player.reset( true );
			player.animateRepop();
		}
	};

	this.changeMap = function() {
		// get new map
		var map = world.map.id == Map.Types.FLAG.id ? Map.Types.STANDARD : Map.Types.FLAG;
		$( '#switchMode' ).html( map.id == Map.Types.FLAG.id ? 'Switch to Battle mode' : 'Switch to Capture the Flag mode' );
		
		world.pause();

		// reset world
		world.remove( world.getBodies() );
    while ( renderer.stage.children.length > 0 ) {
    	renderer.stage.removeChild( renderer.stage.children[0] );
    }

    // create new map
	  var mapElements = new Map( map.id, world.viewport );
	  world.add( mapElements );
	  world.map = map;

    _this.reset();

		world.unpause();
	};

	this.addAIPlayer = function() {
		addPlayer( new Date().getTime(), AI.Levels.EASY );
	};

	this.removeAIPlayer = function() {
		// remove random AI player
		if ( aiPlayers.length > 0 ) {
			removePlayer( aiPlayers[parseInt( Math.random() * aiPlayers.length )].id );
		}
	};

}

Game.IMAGES_PATH = 'images/game/';
Game.TEAM_COLORS = ['#ee3224', '#fcff00', '#60b038', '#0994ff'];
Game.CHARACTERS = ['tomato', 'lemon', 'green_tomato', 'blue_lemon'];
