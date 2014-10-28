var stripe = require('../lib/stripe');
var async = require('async');
var http = require('http');

module.exports = function(hoodie) {

	function replier(request, reply) {
		//reply('do request');
		// var response = reply('success').hold();

		var data = "";
		http.get('http://freegeoip.net/json/', function (http_res) {
		    // this event fires many times, each time collecting another piece of the response
		    http_res.on("data", function (chunk) {
		        // append this chunk to our growing `data` var
		        data += chunk;
		    });

		    // this event fires *one* time, after all the `data` events/chunks have been gathered
		    http_res.on("end", function () {
		        // you can use res.send instead of console.log to output via express
		        reply(data);
		    });
		});
	};

	return {
		'server.api.plugin-request': replier
	};
}