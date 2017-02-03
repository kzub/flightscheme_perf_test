// copy & paste from conditions/postsearch.js
var FlightScheme = {
	execute: function(context, params, op, callback){
		var from = stringUtils.xsplit(params.From, ',');
		var to = stringUtils.xsplit(params.To, ',');
		var through = stringUtils.xsplit(params.Throught, ',');
		var tripsByDirections;
		var fromPoint, toPoint;
		var throughPoints = [];
		var errorFindingCity = [];
		var firstDirection;
		var lastDirection;
		var destinationTrip;
		var isRT;

		function replaceZoneWithPoints(points){
			var newPoints = [];

			for(var i = 0; i < points.length; i++){
				var pointOrZone = points[i];

				if(pointOrZone.length > 3){
					var zonePoints = zones.getZonePoints(pointOrZone, context.zones);
					if(zonePoints.length){
						newPoints = newPoints.concat(zonePoints);
						continue;
					}
				}

				newPoints.push(pointOrZone);
			}

			return newPoints;
		}

		// replace zone names with points (airport or city)
		from    = replaceZoneWithPoints(from);
		to      = replaceZoneWithPoints(to);
		through = replaceZoneWithPoints(through);

		if(context.originRequest === undefined && context.trips.length === 0){
			callback(undefined, false);
			return;
		}

		if(context.trips.length === 0){
			firstDirection = context.originRequest.directions[0];
			lastDirection = context.originRequest.directions[context.originRequest.directions.length >> 2];
		}
		else{
			tripsByDirections = shares.groupTripsByDirection(context.trips);
			firstDirection = tripsByDirections[0][0]; /* actually firstTrip */
			lastDirection = tripsByDirections[tripsByDirections.length - 1];
			lastDirection = lastDirection[lastDirection.length - 1]; /* actually lastTrip */
			var directionHelper = tripsByDirections[tripsByDirections.length >> 2];
			destinationTrip = directionHelper[directionHelper.length - 1];
		}

		var rtcFrom = shares.getCityByCode(firstDirection.from); // if country => capital
		var rtcTo   = shares.getCityByCode(lastDirection.to);

		isRT = rtcFrom == rtcTo;

		if((params.IsOW === true && params.IsRT === false) ||
				(params.IsOW === false && params.IsRT === true)){
			if(params.IsOW === true && isRT === true ||
				params.IsRT === true && isRT === false){
				callback(undefined, op == '=' ? false : true);
				return;
			}
		}

		if(isRT){
			fromPoint = firstDirection.from;
			toPoint = lastDirection.to;

			if(destinationTrip){
				toPoint = destinationTrip.to;
			}
		}
		else{
			fromPoint = firstDirection.from;
			toPoint = lastDirection.to;
		}

		if(context.trips.length !== 0){
			for(var tripsIdx in tripsByDirections){
				var trips = tripsByDirections[tripsIdx];

				if(trips.length == 1){
					break;
				}

				for(var q = 1; q < trips.length; ++q){
					var t = trips[q];

					if(throughPoints.indexOf(t.from) == -1){
						var city = shares.getCityByCode(t.from);

						if(city === undefined){
							errorFindingCity.push(t.from);
						}
						else{
							throughPoints.push(t.from);
						}
					}
				}
			}
		}
		else{
			for(var dirIdx = 1; dirIdx < context.originRequest.directions.length; dirIdx++){
				var dir = context.originRequest.directions[dirIdx];

				if(throughPoints.indexOf(dir.from) == -1){
					var throughCity = shares.getCityByCode(dir.from);

					if(throughCity === undefined){
						errorFindingCity.push(dir.from);
					}
					else{
						throughPoints.push(dir.from);
					}
				}
			}
		}

		var fromCity = shares.getCityByCode(fromPoint);
		var toCity = shares.getCityByCode(toPoint);

		if(fromCity === undefined){
			errorFindingCity.push(fromPoint);
		}

		if(toCity === undefined){
			errorFindingCity.push(toPoint);
		}

		// Check planes in trips and if TRN - skip error logs
		if(errorFindingCity.length > 0){
			// ToDo In one beautiful moment return and add to reference all airport
			log.d('postsearch_1', 'CANT FIND CITIES FOR', errorFindingCity.toString());
			callback(undefined, false);
			return;
		}

		var i, j;
		var il, jl;
		var cur;
		var point, throughPoint;

		// from part
		var fromMatched = from.length === 0;

		if(from.length > 0){
			for(i = 0, il = from.length; i < il; ++i){
				cur = from[i];

				if(cur.length == 2){
					point = shares.getTypeFromCode(fromPoint, 'country');
				}else{
					point = shares.getTypeFromCode(fromPoint, 'city');
				}

				if(cur == point || cur == fromPoint){ // fromPoint == airport
					fromMatched = true;
					break;
				}
			}
		}

		// to part
		var toMatched = to.length === 0;

		if(to.length > 0){
			for(i = 0, il = to.length; i < il; ++i){
				cur = to[i];

				if(cur.length == 2){
					point = shares.getTypeFromCode(toPoint, 'country');
				}else{
					point = shares.getTypeFromCode(toPoint, 'city');
				}

				if(cur == point || cur == toPoint){  // toPoint == airport
					toMatched = true;
					break;
				}
			}
		}

		// trought part
		var throughMatched = through.length === 0;

		if(through.length > 0){
			for(i = 0, il = through.length; i < il; ++i){
				cur = through[i];

				for(j = 0, jl = throughPoints.length; j < jl; j++){
					throughPoint = throughPoints[j];

					if(cur.length == 2){
						point = shares.getTypeFromCode(throughPoint, 'country');
					}else{
						point = shares.getTypeFromCode(throughPoint, 'city');
					}

					if(cur == point || cur  == throughPoint){ // throughPoint - airport
						throughMatched = true;
						break;
					}
				}

				if(throughMatched === true){
					break;
				}
			}
		}

		// calculate result
		var result = fromMatched && toMatched && throughMatched;

		//CHECK FOR INVERTED SCHEME
		if(!result && params.AndInverted === true){
			var directionXchange = function(p){
				var saved = p.From;

				p.From = p.To;
				p.To   = saved;
			};

			directionXchange(params);//change order
			params.AndInverted = false;

			FlightScheme.execute(context, params, op, function(err, result2){
				directionXchange(params);//restore order
				params.AndInverted = true;
				result = result || result2;
				callback(undefined, op === '=' ? result : !result);
			});

			return;
		}

		callback(undefined, op === '=' ? result : !result);
	}
	//,
	// getMeta: function(){
	// 	return {
	// 		tag: "FlightScheme",
	// 		applies: ["presearch", "postsearch" ],
	// 		name: {
	// 			ru: "Схема перелета",
	// 			en: "Flight scheme"
	// 		},
	// 		ops: ['=', '!='],
	// 		profileTypes: ["agent", "subagent", "reseller"],
	// 		descr: {
	// 			ru: "схема перелета {op} вылет из {From} прилет в {To} и обратно={AndInverted}, через {Throught}",
	// 			en: "flight scheme {op} from {From} to {To} and reverse={AndInverted}, throught {Throught}"
	// 		},
	// 		params: {
	// 			From: params.createStringParam('из', 'from'),
	// 			Throught: params.createStringParam('через', 'through'),
	// 			To: params.createStringParam('в', 'to'),
	// 			IsRT: params.createBooleanParam('RT', 'RT'),
	// 			IsOW: params.createBooleanParam('OW', 'OW'),
	// 			AndInverted: params.createBooleanParam('+INV', '+INV')
	// 		}
	// 	};
	// }
};

module.exports.FlightScheme = FlightScheme;

// copy & paste from other modules
var stringUtils = {
	xsplit: function(input, delimiter){
		var cleanArray = [];

		input.split(delimiter).forEach(function(i){
			if(i !== undefined){
				var ii = i.trim();
				if(ii !== ''){
					cleanArray.push(ii);
				}
			}
		});

		return cleanArray;
	}
};

var zones = {
	getZoneByName: function (zoneName, zonesFromContext) {
		if(!zonesFromContext){
			return;
		}

		for(var i = 0; i < zonesFromContext.length; i++){
			var zone = zonesFromContext[i];
			if(zone.name == zoneName){
				return zone;
			}
		}
	},
	getZonePoints: function (zoneName, zonesFromContext) {
		var points = [];
		
		var zone = zones.getZoneByName(zoneName, zonesFromContext);
		if(!zone){
			return points;
		}

		for(var i = 0; i < zone.members.length; i++){
			var member = zone.members[i];
			if(member && member.code){
				points.push(member.code);
			}
		}
		return points;
	}
};

var fs = require('fs');
var path = '/Users/zubkov/project/avia/src/tw_shared_types/references/geo/';
var ref = new Geo();

function Geo() {
	this.airports = JSON.parse(fs.readFileSync(path + 'airports.json'));
	this.cities = JSON.parse(fs.readFileSync(path + 'cities.json'));
}
Geo.prototype.isCity = function(code){
	return this.cities[code] != undefined;
};
Geo.prototype.isAirport = function(code){
	return this.airports[code] != undefined;
};
Geo.prototype.getCityCodeByAirportCode = function(code){
	if(this.airports[code] != undefined){
		return this.airports[code].city;
	}
	return undefined;
};
Geo.prototype.getCountryCodeByCityCode = function(code){
	if(this.cities[code] != undefined){
		return this.cities[code].country;
	}
	return undefined;
};
Geo.prototype.getCountryCodeByAirportCode = function(code){
	var airport = this.airports[code];

	if(airport == undefined){
		return undefined;
	}

	var city = this.cities[airport.city];

	if(city != undefined){
		return city.country;
	}

	return undefined;
};

var shares = {
	getCityByCode: function(point){
		var city;
		var airport = ref.airports[point];

		if(airport === undefined || airport === null){
			city = ref.cities[point] && ref.cities[point].code;
		}
		else{
			city = airport.city;
		}

		return city;
	},
	getTypeFromCode: function(code, type){
		var result;

		if(type == "city"){
			if(ref.isCity(code)){
				result = code;
			}
			else if(ref.isAirport(code)){
				result = ref.getCityCodeByAirportCode(code);
			}
		}
		else if(type == "country"){
			if(ref.isCity(code)){
				result = ref.getCountryCodeByCityCode(code);
			}
			else if(ref.isAirport(code)){
				result = ref.getCountryCodeByAirportCode(code);
			}
		}
		else if(type == "airport"){
			if(ref.isAirport(code)){
				result = code;
			}
			//result = ref.getCountryCodeByAirportCode(code);
		}

		return result;
	}
}
