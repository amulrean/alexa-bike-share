var Alexa = require('alexa-sdk');
var bikeShare = require('capital-bike-share-js');
var geocoder = require('geocoder');

var appId = 'amzn1.ask.skill.ca307c70-126d-4190-b9c7-f44180a0f4af'; //'amzn1.echo-sdk-ams.app.your-skill-id';


// bikeShare.getById('167', (err, data) => {
//   console.log(data);
//   console.log(err);
//
//   geocoder.geocode("Ballston, VA", (geoErr, geoData) => {
//         // console.log(geoData);
//         // console.log(geoData.results[0].geometry.location);
//         var bikeShareLocation = {
//             latitude: geoData.results[0].geometry.location.lat,
//             longitude: geoData.results[0].geometry.location.lng
//         };
//         var response = "";
//         bikeShare.getClosestByDistance(bikeShareLocation, ONEMILEINMETERS, (err, data) => {
//             console.log(data.length);
//             nearByStations = data;
//             nearByStationIndex = 0;
//
//             response = getCurrentBikeShareStationResponse();
//
//             console.log(response);
//         });
//     });
//
//   // var response = data[0].name[0] + ' has ' + data[0].nbBikes[0] + ' bikes available and ' + data[0].nbEmptyDocks[0] + ' empty docks.';
//   //
//   //   response = _.replace(response, '&', 'and');
//   //
//   //   console.log(response);
// });

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.appId = appId;
    // alexa.dynamoDBTableName = 'alexaBikeShare';
    alexa.registerHandlers(newSessionHandlers, locationListHandler);
    alexa.execute();
};

var states = {
    LISTMODE: '_LISTMODE',
};

var ONEMILEINMETERS = 1609.34;

var currentLocation;

var nearByStations = [];
var nearByStationIndex = 0;

var welcomeMessage = "Capital Bike Share Info. Say a location or address to find station status for the area.";

var welcomeRepromt = "Try saying Clarendon Virginia or 1600 Pennsylvania Ave, Washington DC";

var locationSearchError = "I didn't understand that location.";

var locationToFarError = "There are no bike share locations within 1 mile of that location";

var nextOrPreviousMessage = "To hear more stations say next, previous or repeat.";

var goodbyeMessage = "OK, have a good ride.";

var HelpMessage = "Here are some things you can say: A location or address like Clarendon Virginia or 1600 Pennsylvania Ave, Washington DC. What would you like to do?";


var newSessionHandlers = {
    'LaunchRequest': function () {
        this.emit(':ask', welcomeMessage, welcomeRepromt);
    },
    'MyStationIntent': function () {
        bikeShare.getById('167', (err, data) => {
            nearByStations = data;
            nearByStationIndex = 0;
            var response = getCurrentBikeShareStationResponse();
            setCurrentLocationToBikeShareStation(data[0]);

            this.emit(':tell', response);
        })
    },
    'LocationSearchIntent': function () {
        console.log('Address obj: ' + this.event.request.intent.slots.address);

        var searchValue = '';
        if (this.event.request.intent.slots.address.value) {
            searchValue = this.event.request.intent.slots.address.value;
        } else if (this.event.request.intent.slots.admin.value) {
            searchValue = this.event.request.intent.slots.admin.value;
        } else {
            this.emit(':ask', locationSearchError, welcomeRepromt);
        }

        geocoder.geocode(searchValue, (geoErr, geoData) => {

            var response = "You said: " + searchValue + ". ";
            response += "Google Geo coder found: " + geoData.results[0].formatted_address + ". ";

            setCurrentLocationToBGeoCoderResult(geoData.results[0]);

            bikeShare.getClosestByDistance(currentLocation, ONEMILEINMETERS, (err, data) => {

                if (data && data.length > 0) {
                    response += "There are " + data.length + " bike share stations within 1 mile. ";

                    nearByStations = data;
                    nearByStationIndex = 0;

                    response += "The closest station ";
                    response += getCurrentBikeShareStationResponse();

                    this.emit(':ask', response, nextOrPreviousMessage);

                } else {

                    response += locationToFarError;

                    this.emit(':ask', response, welcomeRepromt);
                }
            });
        });

    },
    'AMAZON.NextIntent': function () {
        if (nearByStations && nearByStations.length > 0) {
            var response  = "";
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
            var response  = "";
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
            var response  = "";
            response += getCurrentBikeShareStationResponse();
            this.emit(':ask', response, nextOrPreviousMessage);
        } else {
            this.emit(':ask', welcomeMessage, welcomeRepromt);
        }
    },
    'AMAZON.StopIntent': function () {
        console.log('New Stop');
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
        console.log('New Unhandled');
        this.emit(':ask', HelpMessage, welcomeRepromt);
    },
};


function setCurrentLocationToBikeShareStation(bikeShareResult) {
    currentLocation = {
        latitude: bikeShareResult.lat,
        longitude: bikeShareResult.lng
    }
}

function setCurrentLocationToBGeoCoderResult(geoCoderResult) {
    currentLocation = {
        latitude: geoCoderResult.geometry.location.lat,
        longitude: geoCoderResult.geometry.location.lng
    }
}

var locationListHandler = Alexa.CreateStateHandler(states.STATIONMODE, {
    'StateSearchIntent': function () {
        console.log('State Search Intent');
        var stateSlotValue = this.event.request.intent.slots.state.value;
        response = "You said: " + stateSlotValue;
        this.emit(':tell', response);
    },
    'AMAZON.HelpIntent': function () {
        output = HelpMessage;
        this.emit(':ask', output, HelpMessage);
    },
    'AMAZON.StopIntent': function () {
        console.log('State: ' + this.handler.state);
        this.handler.state = '';
        console.log('State: ' + this.handler.state);
        this.emit(':saveState', true);
        console.log('State: ' + this.handler.state);
        this.emit(':tell', goodbyeMessage);
        console.log('State: ' + this.handler.state);
    },
    'AMAZON.RepeatIntent': function () {
        this.emit(':ask', output, HelpMessage);
    },
    'AMAZON.CancelIntent': function () {
        // Use this function to clear up and save any data needed between sessions
        this.emit(":tell", goodbyeMessage);
    },
    'SessionEndedRequest': function () {
        // Use this function to clear up and save any data needed between sessions
        console.log('Seassion Ended Intent');
        this.handler.state = '';
        this.emit(':saveState', true);
    },
    'Unhandled': function () {
        output = HelpMessage;
        this.emit(':ask', output, welcomeRepromt);
    }
});

function getCurrentBikeShareStationResponse() {

    var filledResponse = getBikeStationResponse(nearByStations[nearByStationIndex]);

    filledResponse = filledResponse.replace(/&/g, "and");
    filledResponse = filledResponse.replace(/\//g, "");

    return filledResponse;
}

function getBikeStationResponse(stationData) {
    return stationData.name[0] + ' has ' + stationData.nbBikes[0] + ' bikes available and ' + stationData.nbEmptyDocks[0] + ' empty docks. ';
}
