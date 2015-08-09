var Map = require('can/map/');
var superMap = require('can-connect/can/super-map/');
var tag = require('can-connect/can/tag/');
require("can/map/define/");


var Stat = Map.extend({
	statTypes: [
		{ name: "1P"},
		{ name: "1PA"},
		{ name: "2P"},
		{ name: "2PA"},
		{ name: "ORB"},
		{ name: "DRB"},
		{ name: "Ast"},
		{ name: "Stl"},
		{ name: "Blk"},
		{ name: "1PA"},
		{ name: "To"}
	]
},{
	define: {
		time: {
			set: function(newVal){
				return Math.round(newVal);
			}
		},
		player: {
			serialize: false
		}
	}
});
Stat.List = can.List.extend({Map: Stat},{});

var statConnection = superMap({
  Map: Stat,
  List: Stat.List,
  url: "/services/stats",
  name: "stat"
});

tag("stat-model", statConnection);

module.exports = Stat;