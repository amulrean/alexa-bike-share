var Alexa = require('alexa-sdk');
var api = require('capital-bike-share-js');
var _ = require('lodash');

// api.getById('167', function(err, data) {
//   console.log(data);
//   console.log(err);
//
//   var response = data[0].name[0] + ' has ' + data[0].nbBikes[0] + ' bikes available and ' + data[0].nbEmptyDocks[0] + ' empty docks.';
//
//     response = _.replace(response, '&', 'and');
//
//     console.log(response);
// });

var handlers = {
    MyStationIntent() {
      api.getById('167', (err, data) => {
        var response = data[0].name[0] + ' has ' + data[0].nbBikes[0] + ' bikes available and ' + data[0].nbEmptyDocks[0] + ' empty docks.';

        response = _.replace(response, '&', 'and');

        this.emit(':tell', response);
      })
    },
};

exports.handler = function (event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.registerHandlers(handlers);
    alexa.execute();
};