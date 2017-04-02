var Alexa = require('alexa-sdk');
var bikeShare = require('capital-bike-share-js');
var geocoder = require('geocoder');
var _ = require('lodash');
var geoDistance = require('node-geo-distance');

var appId = 'amzn1.ask.skill.ca307c70-126d-4190-b9c7-f44180a0f4af'; //'amzn1.echo-sdk-ams.app.your-skill-id';

// Alexa Handler
exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    // alexa.dynamoDBTableName = 'alexaBikeShare';
    alexa.registerHandlers(newSessionHandlers);
    alexa.execute();
};


// var DCBOUNDS = {
//     "northeast" : {
//       "lat" : 39.2,
//       "lng" : -77.3
//    },
//    "southwest" : {
//       "lat" : 38.76,
//       "lng" : -76.84
//    }
// };
var ONEMILEINMETERS = 1609.34;

var cachedBikeShareResults;

var currentGeoCoderResult;

var nearByStations = [];
var nearByStationIndex = 0;

var welcomeMessage = "Capital Bike Share Info. Say search and then a location or address to find station status for bike share docks near the location. Try Saying: search Clarendon Metro or find station near 1600 Pennsylvania Ave.";

var welcomeRepromt = "Try saying Search Clarendon Virginia or Search 1600 Pennsylvania Ave, Washington DC";

var locationSearchError = "I didn't understand that location.";

var locationToFarError = "There are no bike share locations within 1 mile of";

var nextOrPreviousMessage = "To hear information about other bike share stations in the area say next, previous, repeat or more information.";

var goodbyeMessage = "OK, have a good ride.";

var HelpMessage = "Here are some things you can say: A location or address like Clarendon Virginia or 1600 Pennsylvania Ave, Washington DC. What would you like to do?";


var newSessionHandlers = {
    'LaunchRequest': function () {
        this.emit(':ask', welcomeMessage, welcomeRepromt);
    },
    'LocationSearchIntent': function () {
        var topDate = +new Date();

        var searchValue = _.get(this, 'event.request.intent.slots.admin.value', undefined);

        if (searchValue === undefined) {
            this.emit(':ask', locationSearchError, welcomeRepromt);
        } else {
            var geoCoderOptions = {
                // bounds: DCBOUNDS
            };

            geocoder.geocode(searchValue, (geoErr, geoData) => {

                var geoCoderResults = geoData.results;
                if (cachedBikeShareResults === undefined) {
                    bikeShare.getAll((err, data) => {
                        cachedBikeShareResults = data;

                        processGeoCoderResults(this, geoCoderResults, searchValue);
                    });
                } else {
                    processGeoCoderResults(this, geoCoderResults, searchValue);
                }
            }, geoCoderOptions);
        }

    },
    'AMAZON.NextIntent': function () {
        if (nearByStations && nearByStations.length > 0) {
            var response = "";
            nearByStationIndex = nearByStationIndex + 1;
            if (nearByStationIndex === nearByStations.length) {
                nearByStationIndex = nearByStationIndex - 1;
                response = "You have reached the end of the stations";
                this.emit(':ask', response, nextOrPreviousMessage);
            } else {
                var verbalIndex = nearByStationIndex + 1;
                response += "Station " + verbalIndex + " of " + nearByStations.length + " ";
                response += getCurrentBikeShareStationResponse();
                this.emit(':ask', response, nextOrPreviousMessage);
            }

        } else {
            this.emit(':ask', welcomeMessage, welcomeRepromt);
        }
    },
    'AMAZON.PreviousIntent': function () {
        if (nearByStations && nearByStations.length > 0) {
            var response = "";
            nearByStationIndex = nearByStationIndex - 1;
            if (nearByStationIndex < 0) {
                nearByStationIndex = 0;
                response = "You are already on the closest station.";
                this.emit(':ask', response, nextOrPreviousMessage);
            } else {
                var verbalIndex = nearByStationIndex + 1;
                response += "Station " + verbalIndex + " of " + nearByStations.length + " ";
                response += getCurrentBikeShareStationResponse();
                this.emit(':ask', response, nextOrPreviousMessage);
            }
        } else {
            this.emit(':ask', welcomeMessage, welcomeRepromt);
        }
    },
    'AMAZON.RepeatIntent': function () {
        if (nearByStations && nearByStations.length > 0) {
            var response = "";
            response += getCurrentBikeShareStationResponse();
            this.emit(':ask', response, nextOrPreviousMessage);
        } else {
            this.emit(':ask', welcomeMessage, welcomeRepromt);
        }
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', goodbyeMessage);
    },
    'AMAZON.CancelIntent': function () {
        // Use this function to clear up and save any data needed between sessions
        this.emit(":tell", goodbyeMessage);
    },
    'SessionEndedRequest': function () {
        // Use this function to clear up and save any data needed between sessions
        this.emit('AMAZON.StopIntent');
    },
    'Unhandled': function () {
        this.emit(':ask', HelpMessage, welcomeRepromt);
    },
};

function getLocationObjectFromGeoCoderResult(geoCoderResult) {
    return {
        latitude: geoCoderResult.geometry.location.lat,
        longitude: geoCoderResult.geometry.location.lng
    }
}

function getCurrentBikeShareStationResponse() {

    var filledResponse = getBikeStationResponse(nearByStations[nearByStationIndex]);

    filledResponse = filledResponse.replace(/&/g, "and");
    filledResponse = filledResponse.replace(/\//g, "");

    return filledResponse;
}

function getBikeStationResponse(stationData) {
    return stationData.name[0] + ' has ' + stationData.nbBikes[0] + ' bikes available and ' + stationData.nbEmptyDocks[0] + ' empty docks. ';
}

function getLocalityLongName(geoCoderResult) {
    var localityRecord = geoCoderResult.address_components.find(function (addressComponent) {

        return addressComponent &&
            addressComponent['types'] &&
            addressComponent.types.indexOf('locality') != -1;
    });
    if (localityRecord) {
        return localityRecord.long_name;
    }
    return '';

}

function getStationsWithinDistance(location, distanceInMeters) {

    var filtered;

    if (cachedBikeShareResults) {
        filtered = cachedBikeShareResults.map(function (el) {
            var coordinates = {latitude: parseFloat(el.lat[0]), longitude: parseFloat(el.long[0])}
            el.distance = geoDistance.vincentySync(coordinates, location);
            return el;
        }).filter(function (value) {
            return value.distance < distanceInMeters;
        }).sort(function (a, b) {
            return a.distance - b.distance;
        });
    }

    return filtered;
}

// Loop through all geoCoder Results and find the first one that has bike share locations.
function setNearByStations(geoCoderResults, distanceInMeters) {

    nearByStations = [];
    for (var resultKey in geoCoderResults) {
        var result = geoCoderResults[resultKey];
        var resultLocation = getLocationObjectFromGeoCoderResult(result);
        var closeStations = getStationsWithinDistance(resultLocation, distanceInMeters);
        if (closeStations.length > 0) {
            nearByStations = closeStations;
            currentGeoCoderResult = result;
            return;
        }
    }
}

function processGeoCoderResults(alexa, geoCoderResults, searchValue) {

    setNearByStations(geoCoderResults, ONEMILEINMETERS);

    if (nearByStations && nearByStations.length > 0) {

        nearByStationIndex = 0;

        var localityName = getLocalityLongName(currentGeoCoderResult);
        var response = "The closest station ";
        response += getCurrentBikeShareStationResponse();
        // response += "There are " + nearByStations.length + " bike share stations within 1 mile of your searched location in " + localityName + ". ";
        response += "Say next station, more information or search for another location.";

        alexa.emit(':ask', response, nextOrPreviousMessage);

    } else {
        var response = locationToFarError + ' ' + searchValue;
        alexa.emit(':ask', response, welcomeRepromt);
    }
}
