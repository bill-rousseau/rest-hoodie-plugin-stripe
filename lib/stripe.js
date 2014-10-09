var _ = require('lodash');
var Stripe = require('stripe');
var util = require('util');

console.log('stripe code loaded!');

//stripe.customersCreate()
module.exports.customersCreate = function (hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey')
	if (!stripeKey) {
		console.log('NO STRIPE KEY CONFIGURED, PLEASE SET IT IN THE ADMIN UI');
		console.log('NO PAYMENT RELATED ACTIONS WILL BE RUN');
		return callback('ignore');
	}

	var stripe = Stripe(stripeKey);

	// worarkound for https://github.com/hoodiehq/hoodie-plugins-api/issues/6
	if (doc.doc) {
		doc = doc.doc;
	}

	if (!doc.stripeToken) {
		// no stripe token yet, we can’t do anything
		console.log('ignore: no stripe token');
		return callback('ignore');
	}

	if (doc.stripeCustomer) {
		// this user is already subscribed to a plan, do nothing
		console.log('ignore: already a customer');
		return callback('ignore');
	}

	if (doc.error) {
		// something is wrong with this user, don’t do anything
		console.log('ignore: user in error state');
		return callback('ignore');
	}

	var handleUserUpdateResponse = function(error) {
		if (error) {
			console.log('ERROR STORING STRIPE CUSTOMER DATA ON USER OBJECT');
			return callback(error);
		}
		return callback(null);
	};

	var handleUserGetResponse = function(error, newDoc, props) {
		_.merge(newDoc, props);
		if (error) {
			console.log('ERROR STORING DATA IN COUCHDB');
			return callback(error);
		}
		hoodie.database(doc.originDb).add('stripe/subscription', {id: doc.planType, stripeCustomer: newDoc.stripeCustomer.subscriptions.data[0]}, handleUserUpdateResponse);
		hoodie.account.update('user', newDoc.id, {stripeCustomerId: newDoc.stripeCustomer.id}, handleUserUpdateResponse);
	};

	var handleStripeResponse = function(error, customer) {
		var props = {};
		if (error) {
			console.log('STRIPE CUSTOMER CREATION ERROR: "%j"', error);
			props.$error = {
				name: error.type,
				message: error.message,
				stripeError: error
			};
		} else {
			props.stripeCustomer = customer;
			props.confirmed = true;
		}
		hoodie.account.find('user', doc.id, function(error, newDoc) {
			// At this point, newDoc is basically the _users' user document
			// And props is the stripeCustomer object that will be added in stripe/... doc
			handleUserGetResponse(error, newDoc, props);
		});
	};

	var username = doc.name.replace(/^user\//, '');

	stripe.customers.create({
		description: 'Customer for ' + username,
		card: doc.stripeToken,
		plan: doc.plan
	}, handleStripeResponse);
};

module.exports.customersUpdateSubscription = function(hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey');
	if (!stripeKey) {
		console.log('NO STRIPE KEY CONFIGURED, PLEASE SET IT IN THE ADMIN UI');
		console.log('NO PAYMENT RELATED ACTIONS WILL BE RUN');
		return callback('ignore');
	}

	if (doc.doc) {
		doc = doc.doc;
	}

	if (!doc.originDb) {
		console.log('NO SUBSCRIPTION UPDATED BECAUSE THERE IS NO USER REGISTERED');
		return callback('ignore');
	}

	if (doc.error) {
		// something is wrong with this user, don’t do anything
		console.log('ignore: user in error state');
		return callback('ignore');
	}

	var stripe = Stripe(stripeKey);

	var handleUserUpdateResponse = function(error) {
		if (error) {
			console.log('ERROR STORING STRIPE CUSTOMER DATA ON USER OBJECT');
			return callback(error);
		}
		return callback(null);
	};

	var handleDocumentUpdate = function(error, sub) {
		if (error) {
			console.log('ERROR : CANNOT UPDATE COUCHDB DOCUMENT');
			return callback(error);
		}
		hoodie.database(doc.originDb).update('stripe/subscription', doc.planType, {
			id: doc.planType,
			stripeCustomer: sub
		}, function(error) {
			handleUserUpdateResponse(error);
		});
	};

	var handleSubscriptionUpdate = function(error, props, sub) {
		if (error) {
			console.log('ERROR : CANNOT UPDATE STRIPE SUBSCRIPTION');
			return callback(error);
		}
		stripe.customers.updateSubscription(props.stripeCustomerId, sub.stripeCustomer.id, {
			plan: doc.plan
		}, function(error, sub) {
			handleDocumentUpdate(error, sub);
			});
	};

	var handleSubscriptionFind = function(error, props) {
		if (error) {
			console.log('ERROR : SUBSCRIPTION NOT FOUND IN COUCHDB');
			return callback(error);
		}
		hoodie.database(doc.originDb).find('stripe/subscription', doc.planType, function(error, sub) {
			handleSubscriptionUpdate(error, props, sub);
		})
	};

	var handleUserFind = function(error, userDoc) {
		var props = {};
		if (error) {
			console.log('ERROR : USER NOT FOUND IN COUCHDB');
			props.$error = {
				name: error.type,
				message: error.message,
				hoodieError: error
			};
		} else {
			props.stripeCustomerId = userDoc.stripeCustomerId;
			props.confirmed = true;
		}
		hoodie.database(doc.originDb).find('stripe/subscription', doc.planType, handleSubscriptionFind(error, props));
	};

	hoodie.account.find('user', doc.id, function(error, user) {
		handleUserFind(error, user);
	});
};

module.exports.customersRetrieveSubscription = function(hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey');
	if (!stripeKey) {
		console.log('NO STRIPE KEY CONFIGURED, PLEASE SET IT IN THE ADMIN UI');
		console.log('NO PAYMENT RELATED ACTIONS WILL BE RUN');
		return callback('ignore');
	}

	var stripe = Stripe(stripeKey);

	var handleRetrieveWithStripe = function(error, props, sub) {
		if (error) {
			console.log('ERROR : CANNOT UPDATE STRIPE SUBSCRIPTION');
			return callback(error);
		}
		return (sub);
	};

	var handleSubscriptionFind = function(error, props, sub) {
		if (error) {
			console.log('ERROR : SUBSCRIPTION NOT FOUND IN COUCHDB');
			return callback(error);
		}

		if (doc.fromStripe === 'true') {
			console.log('true');
			stripe.customers.retrieveSubscription(props.stripeCustomerId, sub.stripeCustomer.id, function(error, sub) {
				handleRetrieveWithStripe(error, props, sub);
			});
		} else {
				console.log('false');
				handleRetrieveWithCouch(error, props, sub);
		}
	};

	var handleUserFind = function(error, userDoc) {
		var props = {};
		if (error) {
			console.log('ERROR : USER NOT FOUND IN COUCHDB');
			props.$error = {
				name: error.type,
				message: error.message,
				hoodieError: error
			};
		} else {
			props.stripeCustomerId = userDoc.stripeCustomerId;
			props.confirmed = true;
		}
		hoodie.database(doc.originDb).find('stripe/subscription', doc.planType, function(error, sub) {
			handleSubscriptionFind(error, props, sub);
		});
	};

	hoodie.account.find('user', doc.id, function(error, userDoc) {
		handleUserFind(error, userDoc);
	});
};



