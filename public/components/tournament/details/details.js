var Component = require("can/component/component");
var CanMap = require("can/map/");
var Team = require("bitballs/models/team");
var Game = require("bitballs/models/game");
var Player = require("bitballs/models/player");
var Tournament = require("bitballs/models/tournament");

require("can/map/define/");
require("bootstrap/dist/css/bootstrap.css!");
require("can/route/");
require("can/view/href/");

exports.ViewModel = CanMap.extend({
	define: {
		tournament: {
			get: function(lastSet, setVal){
				Tournament.get({id: this.attr("tournamentId")}).then(setVal);
			}
		},
		gamesPromise: {
			get: function(){
				return Game.getList({
					where: {tournamentId: this.attr("tournamentId")}
				});
			}
		},
		games: {
			get: function(lastSet, setVal){
				this.attr("gamesPromise").then(setVal);
			}
		},
		gamesGroupedByRound: {
			get: function(){
				console.log("grouping re-evaluate");
				var rounds = [],
					games = this.attr("games");

				if (games) {
					games.each(function(game){
						var roundName = game.attr("round");
						var roundIndex =
							Game.roundToIndexMap[roundName];
						var courtNumber = parseInt(game.attr('court'), 10);
						var courtIndex = courtNumber - 1;
						var round;

						if (!rounds[roundIndex]) {
							// Create Round pseudo-model and store it
							// in the `rounds` list according to the
							// order of `Game.roundNames`
							rounds[roundIndex] = {
								name: roundName,
								courts: new Array(4),
								reservedCourts: {}
							};
						}

						// Get a reference to the Round
						round = rounds[roundIndex];

						// Add the game to the list of courts at the
						// correct index
						round.courts[courtIndex] = game;

						// Add the court number to the list of reserved courts
						round.reservedCourts[courtNumber] = courtIndex;
					});
				}

				return rounds;
			}
		},
		availableCourts: {
			get: function () {
				var availableCourts = [],
					rounds = this.attr('gamesGroupedByRound') || [],
					selectedRoundName = this.attr('game').attr('round'),
					selectedRoundIndex = Game.roundToIndexMap[selectedRoundName],
					maxCourtReserverations = Game.roundNames.length,
					courtReserverations = {},
					courtNumber, reservationCount;

				// If a particular round is selected limit the search to
				// that round
				if (rounds.length && typeof selectedRoundIndex === 'number') {
					maxCourtReserverations = 1;
					rounds = rounds[selectedRoundIndex] ?
						[rounds[selectedRoundIndex]] : [];
				}

				// Sum up the total reserverations of each court in each round
				rounds.forEach(function (round) {
					round.reservedCourts.forEach(function (courtIndex, courtNumber) {
						// Get the current reserveration count for the given court
						reservationCount = courtReserverations[courtNumber];

						// Increment the reserverations counter
						courtReserverations[courtNumber] =
							typeof reservationCount === 'number' ? reservationCount + 1 : 1;
					});
				});

				for (courtNumber = 1; courtNumber <= 4; courtNumber++) {
					reservationCount = courtReserverations[courtNumber];

					// Add the court number to the available courts list if
					// the court was used less than expected
					if (! reservationCount || reservationCount < maxCourtReserverations) {
						availableCourts.push(courtNumber);
					}
				}

				return availableCourts;
			}
		},
		teamsPromise: {
			get: function(){
				return Team.getList({
					where: {tournamentId: this.attr("tournamentId")}
				});
			}
		},
		teams: {
			get: function(lastSet, setVal){
				this.attr("teamsPromise").then(setVal);
			}
		},
		teamColors: {
			value: Team.colors,
			type: "*"
		},
		availableColors: {
			get: function(){
				var teams = this.attr("teams");
				if(!teams) {
					return this.attr("teamColors");
				} else {
					var allColors = this.attr("teamColors").slice(0);
					teams.each(function(team){
						var index = allColors.indexOf(team.attr("color"));
						if(index !== -1) {
							allColors.splice(index, 1);
						}
					});
					return allColors;
				}
			},
			value: "*"
		},
		game: {
			Value: Game
		},
		team: {
			Value: Team
		},
		playersPromise: {
			value: function(){
				return Player.getList({orderBy: "name"});
			}
		},
		players: {
			get: function(set, resolve){
				this.attr("playersPromise").then(resolve);
			}
		},
		playerIdMap: {
			get: function(){
				var map = {},
					players = this.attr("players");

				if(players) {
					players.each(function(player){
						map[player.attr("id")] = player;
					});
				}

				return map;
			},
			type: "*"
		},
		teamIdMap: {
			get: function(){
				var map = {};
				var teams = this.attr("teams");
				if(teams) {
					teams.each(function(team){
						map[team.attr("id")] = team;
					});
				}

				return map;
			},
			type: "*"
		}
	},
	availableTeamFor: function(name, round){
		var teams = this.attr("teams");
		var games = this.attr("games");
		if(!games || !teams) {
			return [];
		}

		if(!round) {
			return teams;
		}
		// hack b/c canjs sucks
		teams.attr("length");
		var remainingTeams = teams.slice(0);
		games.forEach(function(game){
			if(game.attr("round") === round) {
				remainingTeams.removeById(game.attr("homeTeamId"));
				remainingTeams.removeById(game.attr("awayTeamId"));
			}
		});

		var opposite = name === "home" ? "away" : "home",
			oppositeId = this.attr("game").attr(opposite+"TeamId");

		if(oppositeId) {
			remainingTeams.removeById(oppositeId);
		}
		return remainingTeams;
	},
	availablePlayersFor: function(team, number){

		var allPlayers = this.attr("players"),
			teams = this.attr('teams');
		if(allPlayers && teams) {
			var usedIds = {};

			teams.each(function(tm){
				if(tm !== team) {
					[1,2,3,4].forEach(function(index){
						usedIds[tm.attr("player"+index+"Id")] = true;
					});
				}
			});


			[1,2,3,4].forEach(function(index){
				if(index !== number) {
					usedIds[team.attr("player"+index+"Id")] = true;
				}
			});
			return allPlayers.filter(function(player){
				return !usedIds[player.attr("id")];
			});
		} else {
			return [];
		}



	},
	createTeam: function(ev){
		ev.preventDefault();
		var self = this;
		if(!this.attr("team.color")){
			this.attr("team").attr("color", this.attr("availableColors")[0]);
		}

		this.attr("team").attr("tournamentId", this.attr("tournamentId"))
			.save(function(){
			self.attr("team", new Team());
		});
	},
	roundNames: Game.roundNames,
	createGame: function(ev) {
		ev.preventDefault();
		var self = this;
		var game = this.attr("game");

		// cleanup that https://github.com/bitovi/canjs/issues/1834 should do for us
		if(!game.attr("court")) {
			game.attr("court","1");
		}

		if(!game.attr("round")) {
			game.attr("round",Game.roundNames[0]);
		}

		game.attr("tournamentId", this.attr("tournamentId"))
			.save(function(){
			self.attr("game", new Game());
		});
	}
});

exports.Component = Component.extend({
	tag: "tournament-details",
	template: require("./details.stache!"),
	viewModel: exports.ViewModel,
	helpers: {
		playerById: function(id, options){
			var idVal = id();
			if(idVal != null) {
				return options.fn( this.attr("playerIdMap")[idVal] );
			} else {
				return;
			}

		},
		teamById: function(id, options){
			var idVal = id();
			if(idVal != null) {
				return options.fn( this.attr("teamIdMap")[idVal] );
			} else {
				return;
			}

		}
	}
});
