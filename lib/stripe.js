var _ = require('lodash');
var Stripe = require('stripe');
var util = require('util');
var async = require('async');

console.log('stripe code loaded!');
//TODO : CREATE MORE THAN ONE SUBSCRIPTION BY HOODIE LOGIN


//stripe.customersCreate()
var ignoreTests = function(hoodie, doc, callback, stripeKey) {
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
};

module.exports.listPlans = function(hoodie, doc, reply, callback) {
	var stripeKey = hoodie.config.get('stripeKey');

	var stripe = Stripe(stripeKey);

	//reply('Listing all Plans...');
	stripe.plans.list(function(error, plans) {
		if (error) {
				console.log('ERROR STORING STRIPE CUSTOMER DATA ON USER OBJECT');
				return callback(error);
			}
		console.log(plans);
		return callback(null);
	});
};

module.exports.customersCreate = function (hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey');
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
		async.parallel({
			one: function(cb) {
				hoodie.database(doc.originDb).add('stripe/subscription', {id: doc.planType, stripeCustomer: newDoc.stripeCustomer.subscriptions.data[0]}, function(error) {
					cb(null, 1);
				});
			},
			two: function(cb) {
				if (!newDoc.stripeCustomerId) {
					hoodie.account.update('user', newDoc.id, {stripeCustomerId: newDoc.stripeCustomer.id}, function(error) {
						cb(null, 2);
					});
				}
			}
		}, function(err, results) {
			handleUserUpdateResponse(err, results);
		});
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
		plan: doc.plan,
		quantity: doc.quantity
	}, function(err, customer) {
		// if (customer) {
		// 	reply(customer);
		// }
		handleStripeResponse(err, customer);
	});
// });
};

module.exports.customersUpdateSubscription = function(hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey');

	ignoreTests(hoodie, doc, callback, stripeKey);

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

// NOT OK BECAUSE ON DYNAMIC.JS, REPLY SEEMS TO BE BUGGED
module.exports.customersRetrieveSubscription = function(hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey');

	ignoreTests(hoodie, doc, callback, stripeKey);

	var stripe = Stripe(stripeKey);

	var handleRetrieveWithStripe = function(error, props, sub) {
		if (error) {
			console.log('ERROR : CANNOT RETRIEVE SUBSCRIPTION FROM STRIPE');
			return callback(error);
		}
		return callback(null, sub);
	};

	var handleRetrieveWithCouch = function(error, props, sub) {
		if (error) {
			console.log('ERROR : CANNOT RETRIEVE SUBSCRIPTION FROM COUCHDB');
			return callback(error);
		}
		//reply(sub);
		return callback(null, sub.stripeCustomer);
	};

	var handleSubscriptionFind = function(error, props, sub) {
		if (error) {
			console.log('ERROR : SUBSCRIPTION NOT FOUND IN COUCHDB');
			return callback(error);
		}

		if (doc.fromStripe === 'true') {
			stripe.customers.retrieveSubscription(props.stripeCustomerId, sub.stripeCustomer.id, function(error, sub) {
				handleRetrieveWithStripe(error, props, sub);
			});
		} else {
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

module.exports.customersCancelSubscription = function(hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey');

	ignoreTests(hoodie, doc, callback, stripeKey);

	var stripe = Stripe(stripeKey);

	var handleUserUpdateResponse = function(error) {
		if (error) {
			console.log('ERROR STORING STRIPE CUSTOMER DATA ON USER OBJECT');
			return callback(error);
		}
		return callback(null);
	};

	var handleSubscriptionUpdate = function(error, props, sub) {
		if (error) {
			console.log('ERROR : CANNOT UPDATE STRIPE SUBSCRIPTION');
			return callback(error);
		}
		hoodie.database(doc.originDb).update('stripe/subscription', doc.planType, {
			id: doc.planType,
			stripeCustomer: sub
			}, function(error) {
				handleUserUpdateResponse(error);
			}
		);
	};

	var handleSubscriptionFind = function(error, props, sub) {
		if (error) {
			console.log('ERROR : SUBSCRIPTION NOT FOUND IN COUCHDB');
			return callback(error);
		}
		stripe.customers.cancelSubscription(props.stripeCustomerId, sub.stripeCustomer.id, {
			at_period_end: true,
			}, function(error, sub) {
				handleSubscriptionUpdate(error, props, sub);
		});
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
	})
};

// NOT OK UNLESS YOU CAN RETRIEVE THE FINAL SUBS CLIENT-SIDE
module.exports.customersListSubscriptions = function(hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey');

	ignoreTests(hoodie, doc, callback, stripeKey);

	var stripe = Stripe(stripeKey);

	var handleRetrieveWithStripe = function(error, props, sub) {
		if (error) {
			console.log('ERROR : CANNOT RETRIEVE SUBSCRIPTION FROM STRIPE');
			return callback(error);
		}
		return callback(null, sub);
	};

	var handleSubscriptionFind = function(error, props, sub) {
		if (error) {
			console.log('ERROR : SUBSCRIPTION NOT FOUND IN COUCHDB');
			return callback(error);
		}

		if (doc.fromStripe === 'true') {
			stripe.customers.listSubscriptions(props.stripeCustomerId, function(error, subs) {
				console.log(subs);
				handleRetrieveWithStripe(error, props, subs);
			});
		} else {
				console.log(subs);
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
	})
};

module.exports.chargesCreate = function(hoodie, doc,  callback) {
	var stripeKey = hoodie.config.get('stripeKey');

	ignoreTests(hoodie, doc, callback, stripeKey);

	var stripe = Stripe(stripeKey);

	var handleUserUpdateResponse = function(error) {
		if (error) {
			console.log('ERROR STORING STRIPE CUSTOMER DATA ON USER OBJECT');
			return callback(error);
		}
		return callback(null);
	};

	var handleUserGetResponse = function(error, newDoc, props) {
		if (error) {
			console.log('ERROR STORING DATA IN COUCHDB');
			return callback(error);
		}
		hoodie.database(doc.originDb).add('stripe/charge', {
			id: doc.planType,
			charge: props.stripeCharge
		}, handleUserUpdateResponse);
	};

	var handleStripeResponse = function(error, charge) {
		var props = {};
		if (error) {
			console.log('STRIPE CHARGE CREATION ERROR: "%j"', error);
			props.$error = {
				name: error.type,
				message: error.message,
				stripeError: error
			};
		} else {
			props.stripeCharge = charge;
			props.confirmed = true;
		}
		hoodie.account.update('user', doc.id, {
			stripeChargeId: charge.id
		}, function(error, newDoc) {
			handleUserGetResponse(error, newDoc, props);
		});
	};
	stripe.charges.create({
		card: doc.stripeToken,
		amount: doc.amount,
		currency: doc.currency,
		description: 'Charge for ' + doc.id
	}, function(error, charge) {
		handleStripeResponse(error, charge);
	})
};

module.exports.chargesRetrieve = function(hoodie, doc, callback) {
	var stripeKey = hoodie.config.get('stripeKey');

	ignoreTests(hoodie, doc, callback, stripeKey);

	var stripe = Stripe(stripeKey);

	var handleRetrieveWithStripe = function(error, props, charge ) {
		if (error) {
			console.log('ERROR : CANNOT RETRIEVE CHARGE WITH COUCHDB');
			return callback(error);
		}
		return callback(null, charge);
	};

	var handleRetrieveWithCouch = function(error, props, charge) {
		if (error) {
			console.log('ERROR : CANNOT RETRIEVE STRIPE CHARGE WITH STRIPE');
			return callback(error);
		}
		return callback(null, charge.charge);
	};

	var handleChargeFind = function(error, props, charge) {
		if (error) {
			console.log('ERROR : CHARGE NOT FOUND IN COUCHDB');
			return callback(error);
		}
		if (doc.fromStripe === 'true') {
			stripe.charges.retrieve(props.stripeChargeId, function(error, charge) {
				handleRetrieveWithStripe(error, props, charge);
			});
		} else {
				handleRetrieveWithCouch(error, props, charge);
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
			props.stripeChargeId = userDoc.stripeChargeId;
			props.confirmed = true;
		}
		hoodie.database(doc.originDb).find('stripe/charge', doc.planType, function(error, charge) {
			handleChargeFind(error, props, charge);
		});
	};
	hoodie.account.find('user', doc.id, function(error, userDoc) {
		handleUserFind(error, userDoc);
	})
};

module.exports.cleanCouch = function(hoodie, doc, callback) {
	if (!doc) {
		console.log('NO DATABASE TO DELETE');
		return callback('ignore');
	}

	hoodie.database.findAll(function(error, databases) {
		if (error) {
			console.log('ERROR WHEN TRYING TO DELETE DATABASE');
			return callback(error);
		} else {
			var count = 3;
			while (databases[count]) {
				hoodie.database.remove(databases[count], function(error, db) {
					if (error) {
						console.log('ERROR WHEN TRYING TO DELETE DATABASE');
						return callback(error);
					} else {
						console.log('Database ' + db + ' successfully deleted')
					}
				});
				count += 1;
			}
		}
	})
};

// module.exports.chargesList = function(hoodie, doc, callback) {
// 	var stripeKey = hoodie.config.get('stripeKey');

// 	ignoreTests(hoodie, doc, callback, stripeKey);

// 	var stripe = Stripe(stripeKey);

// 	var handleUserFind = function(error, userDoc) {
// 		var props = {};
// 		if (error) {
// 			console.log('ERROR : USER NOT FOUND IN COUCHDB');
// 			props.$error = {
// 				name: error.type,
// 				message: error.message,
// 				hoodieError: error
// 			};
// 		} else {
// 			props.stripeChargeId = userDoc.stripeChargeId;
// 			props.confirmed = true;
// 		}
// 		hoodie.database(doc.originDb).find('stripe/charge', doc.planType, function(error, charge) {
// 			handleChargeFind(error, props, charge);
// 		});
// 	};

// 		hoodie.account.find('user', doc.id, function(error, user) {
// 		handleUserFind(error, user);
// 	})
// }


