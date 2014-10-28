/*
  Hooks allow you to alter the behaviour of hoodie-server,
  Hoodie’s core backend module.

  This is possible:
  - get a notification when something in hoodie-server happens
  - extend core features of hoodie-server from a plugin

  A hook is defined as a function that takes a number of arguments
  and possibly a return value. Each hook has its own conventions,
  based on where in hoodie-server it hooks into.

  There are fundamentally two types of hooks:
  - static hooks (see static.js)
  - dynamic hooks (this file)

  The core difference is that static hooks work standalone and just
  receive a number of arguments and maybe return a value. Dynamic
  hooks get initialised with a live instance of the hoodie object,
  that is also available in worker.js, with access to the database,
  and other convenience libraries.
*/
var stripe = require('../lib/stripe');
var async = require('async');

var camelToDot = function(str) {
	return str.replace(/\W+/g, '.')
	.replace(/([a-z\d])([A-Z])/g, '$1-$2');
};

var dotToCamel = function(str) {
	return str.replace(/\W+(.)/g, function (x, chr) {
		return chr.toUpperCase();
	});
};

function getPlan(plan) {
	return ('PLAN : ' + plan.id + ', ' + (plan.amount / 100).toString() + ' ' + plan.currency.toUpperCase() + '/' + plan.interval + ', ' + plan.trial_period_days + ' days free trial');
}

module.exports = function (hoodie, callback) {

  	return {
		'server.api.plugin-request': function(request, reply) {
			console.log(request.query.subtype);
			switch(request.query.subtype) {
				case 'customers.create' :
					stripe.customersCreate(hoodie, request.query, function(err) {
						if (err && err == 'ignore') {
							reply(false);
						} else {
							reply(true);
						}
					});
					return ;

				case 'customers.updateSubscription':
					stripe.customersUpdateSubscription(hoodie, request.query, function(err) {
						if (err && err == 'ignore') {
							reply(false);
						} else {
							reply(true);
						}
					});
					return ;

				case 'customers.retrieveSubscription':
					stripe.customersRetrieveSubscription(hoodie, request.query, function(err, message) {
						if (err && err == 'ignore') {
							reply(false);
						} else {
							console.log(getPlan(message.plan));
							reply(message);
						}
					});
					return ;

				case 'customers.cancelSubscription':
					stripe.customersCancelSubscription(hoodie, request.query, function(err) {
						if (err && err == 'ignore') {
							reply(false);
						} else {
							reply(true);
						}
					});
					return ;

				case 'customers.listSubscriptions':
					stripe.customersListSubscriptions(hoodie, request.query, function(err, message) {
						if (err && err == 'ignore') {
							console.log('hello false');
							reply(false);
						} else {
							console.log(reply);
							console.log(message);
							// message is what I want to send back to frontend
							reply('hello world, x2');
						}
					});
					return ;

				case 'charges.create':
					stripe.chargesCreate(hoodie, request.query, function(err) {
						if (err && err == 'ignore') {
							reply(false);
						} else {
							reply(true);
						}
					});
					return ;

				case 'charges.retrieve':
					stripe.chargesRetrieve(hoodie, request.query, function(err, message) {
					if (err && err == 'ignore') {
						console.log('hello false');
						reply(false);
					} else {
						console.log(message);
						// message is what I want to send back to frontend
						reply('hello world, x2');
					}
				});
					return ;

				case 'charges.list':
					stripe.chargesList(hoodie, request.query, function(err, message) {
						if (err && err == 'ignore') {
							console.log('hello false');
							reply(false);
						} else {
							console.log(reply);
							console.log(message);
							// message is what I want to send back to frontend
							reply('hello world, x2');
						}
					});
					return ;

				case 'cleanCouch':
					stripe.cleanCouch(hoodie, request.query, function(err) {
						if (err && err == 'ignore') {
							reply(false);
						} else {
							reply(true);
						}
					});
					return ;

				case 'plans.list':
					stripe.listPlans(hoodie, request.query, function(err) {
						if (err && err == 'ignore') {
							reply(false);
						} else {
							reply(true);
						}
					});
					return ;

			}
		}
	};
	// 'plugin.user.confirm': handleConfirm,
	// 'plugin.user.confirm.changeUsername': handleConfirm,
};
