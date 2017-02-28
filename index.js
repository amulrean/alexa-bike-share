var Alexa = require('alexa-sdk');
var bikeShare = require('capital-bike-share-js');
// var _ = require('lodash');
var geocoder = require('geocoder');

var appId = 'amzn1.ask.skill.ca307c70-126d-4190-b9c7-f44180a0f4af'; //'amzn1.echo-sdk-ams.app.your-skill-id';


// bikeShare.getById('167', (err, data) => {
//   // console.log(data);
//   // console.log(err);
//
//   geocoder.geocode("Ballston, VA", (geoErr, geoData) => {
//         // console.log(geoData);
//         // console.log(geoData.results[0].geometry.location);
//         var bikeShareLocation = {
//             latitude: geoData.results[0].geometry.location.lat,
//             longitude: geoData.results[0].geometry.location.lng
//         };
//         var response = "";
//         bikeShare.getByClosest(bikeShareLocation, 5, (err, data) => {
//             response = getBikeShareResponse(data);
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
    alexa.registerHandlers(newSessionHandlers, myStationHandlers, searchHandler, addressSearchHandler, stateSearchHandler);
    alexa.execute();
};

var states = {
    SEARCHMODE: '_SEARCHMODE',
    ADRESSMODE: '_ADRESSMODE',
    STATEMODE: '_STATEMODE',
    CITYMODE: '_CITYMODE',
    MYSTATION: '_MYSTATION'
};

var welcomeMessage = "Capital Bike Share Info. Say Search for location search or my station status.";

var welcomeRepromt = "Search for Stations or My Station Status";

var searchMessage = "What address or location would you like to search?";

var searchRepromt = "Try saying Arlington Virginia";

var goodbyeMessage = "OK, have a good ride.";

var HelpMessage = "Here are some things you can say: Search for stations. My station status.  What would you like to do?";


var newSessionHandlers = {
    'LaunchRequest': function () {
        console.log('New Launch Request');
        output = welcomeMessage;
        this.emit(':ask', welcomeMessage, welcomeRepromt);
    },
    'MyStationIntent': function () {
        console.log('New My Station');
        this.handler.state = states.MYSTATION;
        this.emitWithState('MyStationIntent');
    },
    'SearchIntent': function () {
        console.log('New SearchIntent');
        this.handler.state = states.SEARCHMODE;
        this.emitWithState('SearchIntent');
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = '';
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
        output = HelpMessage;
        this.emit(':ask', output, welcomeRepromt);
    },
};

var myStationHandlers = Alexa.CreateStateHandler(states.MYSTATION, {
    'MyStationIntent': function () {
        bikeShare.getById('167', (err, data) => {
            var response = getBikeShareResponse(data);

            this.emit(':tell', response);
        })
    },
    'AMAZON.HelpIntent': function () {
        output = HelpMessage;
        this.emit(':ask', output, HelpMessage);
    },
    'AMAZON.StopIntent': function () {
        console.log('MyStation Stop');
        this.handler.state = '';
        this.emit(':saveState', true);
        this.emit(':tell', goodbyeMessage);
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
    },
    'Unhandled': function () {
        console.log('My Station Unhandled');
        this.handler.state = '';
        output = HelpMessage;
        this.emit(':ask', output, welcomeRepromt);
    }
});

var searchHandler = Alexa.CreateStateHandler(states.SEARCHMODE, {
    'SearchIntent': function () {
        console.log('Search Search Intent');
        this.handler.state = states.ADRESSMODE;
        this.emit(':ask', searchMessage, searchRepromt);
    },
    'AMAZON.HelpIntent': function () {
        output = HelpSearchMessage;
        this.emit(':ask', output, HelpMessage);
    },
    'AMAZON.StopIntent': function () {
        this.handler.state = undefined;
        this.emit(':tell', goodbyeMessage);
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
    },
    'Unhandled': function () {
        output = HelpMessage;
        this.emit(':ask', output, welcomeRepromt);
    }
});

var addressSearchHandler = Alexa.CreateStateHandler(states.ADRESSMODE, {
    'AddressSearchIntent': function () {
        console.log('Address obj: ' + this.event.request.intent.slots.address);

        var addressSlotValue = this.event.request.intent.slots.address.value;

        geocoder.geocode(addressSlotValue, (geoErr, geoData) => {
            console.log(geoData);
            console.log(geoData.results[0].geometry.location);

            response = "You said an address: " + addressSlotValue + ". ";
            response += "Geocoder found: " + geoData.results[0].formatted_address + ". ";

            var bikeShareLocation = {
                latitude: geoData.results[0].geometry.location.lat,
                longitude: geoData.results[0].geometry.location.lng
            };
            bikeShare.getByClosest(bikeShareLocation, 5, (err, data) => {
                console.log('response before: ' + response);
                response += getBikeShareResponse(data);

                this.emit(':tell', response);
            });
        });

    },
    'AdminSearchIntent': function () {
        console.log('Admin obj: ' + this.event.request.intent.slots.admin);

        var adminSlotValue = this.event.request.intent.slots.admin.value;

        geocoder.geocode(adminSlotValue, (geoErr, geoData) => {
            console.log(geoData);
            console.log(geoData.results[0].geometry.location);

            response = "You said an administration area: " + adminSlotValue + ". ";
            response += "Geocoder found: " + geoData.results[0].formatted_address + ". ";

            var bikeShareLocation = {
                latitude: geoData.results[0].geometry.location.lat,
                longitude: geoData.results[0].geometry.location.lng
            };
            bikeShare.getByClosest(bikeShareLocation, 5, (err, data) => {
                console.log('response before: ' + response);
                response += getBikeShareResponse(data);

                this.emit(':tell', response);
            });
        });

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

var stateSearchHandler = Alexa.CreateStateHandler(states.STATEMODE, {
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

function getBikeShareResponse(bikeShareData) {

    var response = '';

    var filledResponse = bikeShareData.reduce(addBikeStationResponse, response);

    filledResponse = filledResponse.replace(/&/g, "and");
    filledResponse = filledResponse.replace(/\//g, "");

    return filledResponse;
}

function addBikeStationResponse(currentResponse, stationData) {
    return currentResponse += stationData.name[0] + ' has ' + stationData.nbBikes[0] + ' bikes available and ' + stationData.nbEmptyDocks[0] + ' empty docks. ';
}
