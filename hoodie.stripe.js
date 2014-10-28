Hoodie.extend(function (hoodie, lib, utils) {
  'use strict';
  	hoodie.stripe = function() {};

  	var couchDbUsername = function(username) {
		var type = 'user';
		if (hoodie.account.hasAnonymousAccount()){
		  username = hoodie.id();
		  type = 'user_anonymous';
		}
		return type+'/' + username;
  	};

  	var userDocUrl = function(username) {
		return '/_users/org.couchdb.user:' + encodeURIComponent( couchDbUsername(username) );
  	};

  	var getHeaders = function(username, password) {
		return {
		  'Authorization': 'Basic '+btoa(couchDbUsername(username) + ':' + password)
		};
  	};

  	var handleSignUpError = function ( error ) {
		console.log( error );
 	};

  	var validateType = function (type) {
		if (type !== 'stripe') {
		  console.log('not a stripe: ' + type);
		}
  	};

  	var handleFreePlan = function(plan) {
  		if (plan === 'Basic' || plan === 'Pro') {
	  		return plan;
	  	} else {
	  		return 'Free';
	  	}
  	};

  	var handleQuantity = function(quantity) {
  		if (!quantity) {
  			return '1';
  		} else {
  			return quantity;
  		}
  	};

  // extend the hoodie.js API
  	hoodie.stripe.signUpWith = function (username, password) {
		// console.log('> hoodie.account.signUpWith');
		// validateType(type);
		return hoodie.account.signUp(username, password)
		  .done(function() {
		  	console.log('User ' + username + ' logged successfully');
		  })
		  .fail(handleSignUpError);
  	};

	hoodie.stripe.signUpStripe = function(username, password, stripeToken, plan, quantity) {
	  	plan = handleFreePlan(plan);
	  	quantity = handleQuantity(quantity);

	  	console.log(hoodie.id());

		$.ajax({
			type: 'get',
			url: '/_api/_plugins/stripe/_api',
			headers: getHeaders(username, password),
			data: {
				subtype: 'customers.create',
				stripeToken: stripeToken,
				plan: plan,
				id: username,
				planType: 'prototypoOwnSubscription',
				name: hoodie.id(),
				originDb: 'user/' + hoodie.id(),
				quantity: parseInt(quantity)
			},
			contentType: 'application/json'
		})
		.done(function(res, message) {
			console.log(res, message);
			console.log('Stripe Customer created successfully');
		})
		.fail(function(res, message) {
			console.log(res, message);
			console.log('Stripe Customer creation failed')
		});
	};

	hoodie.stripe.updateSub = function(username, password, plan) {
		plan = handleFreePlan(plan);
	  	// console.log('> hoodie.account.updateSub');
	  	$.ajax({
	  		type: 'get',
	  		url: '/_api/_plugins/stripe/_api',
	  		headers: getHeaders(username, password),
	  		data: {
	  			subtype: 'customers.updateSubscription',
	  			plan: plan,
	  			id: username,
	  			planType: 'prototypoOwnSubscription',
	  			originDb: 'user/' + hoodie.id()
	  		}
	  	})
	  	.done(function(res) {
			console.log(res);
	  		console.log('update success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('update failed');
	  	});
	};

	hoodie.stripe.retrieveSub = function(username, password, fromStripe) {
	  	// console.log('> hoodie.account.retrieveSub');
		$.ajax({
			type: 'get',
			url: '/_api/_plugins/stripe/_api',
			headers: getHeaders(username, password),
			data: {
				subtype: 'customers.retrieveSubscription',
				id: username,
				fromStripe: fromStripe,
				planType: 'prototypoOwnSubscription',
				originDb: 'user/' + hoodie.id()
			}
		})
		.done(function(res, message) {
			console.log(res, message);
	  		console.log('retrieve success');
	  	})
	  	.fail(function(res, message) {
			console.log(res, message);
	  		console.log('retrieve failed');
	  	});
	};

	hoodie.stripe.cancelSub = function(username, password) {
		// console.log('> hoodie.account.cancelSub');
		$.ajax({
			type: 'get',
			url: '/_api/_plugins/stripe/_api',
			headers: getHeaders(username, password),
			data: {
				subtype: 'customers.cancelSubscription',
				id: username,
				planType: 'prototypoOwnSubscription',
				originDb: 'user/' + hoodie.id()
			}
		})
		.done(function(res) {
			console.log(res);
	  		console.log('cancel success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('cancel failed');
	  	});
	};

	hoodie.stripe.listSubs = function(username, password, fromStripe) {
		// console.log('> hoodie.account.listSubs');
		$.ajax({
			type: 'get',
			url: '/_api/_plugins/stripe/_api',
			headers: getHeaders(username, password),
			data: {
				subtype: 'customers.listSubscriptions',
				id: username,
				fromStripe: fromStripe,
				planType: 'prototypoOwnSubscription',
				originDb: 'user/' + hoodie.id()
			}
		})
		.done(function(res) {
			console.log(res);
	  		console.log('subs list success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('subs list failed');
	  	});
	};

	hoodie.stripe.createCharge = function(username, password, stripeToken, amount, currency) {
		// console.log('> hoodie.account.createCharge');
	  	console.log(hoodie.id());
		$.ajax({
			type: 'get',
			url: '/_api/_plugins/stripe/_api',
			headers: getHeaders(username, password),
			data: {
				subtype: 'charges.create',
				id: username,
				stripeToken: stripeToken,
				amount: amount,
				currency: currency,
				originDb: 'user/' + hoodie.id(),
				planType: 'prototypoOwnCharge'
			}
		})
		.done(function(res) {
			console.log(res);
	  		console.log('charge creation : success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('charge creation : fail');
	  	});
	};

	hoodie.stripe.retrieveCharge = function(username, password, fromStripe) {
		// console.log('> hoodie.account.retrieveCharge');
		$.ajax({
			type: 'get',
			url: '/_api/_plugins/stripe/_api',
			headers: getHeaders(username, password),
			data: {
				subtype: 'charges.retrieve',
				id: username,
				originDb: 'user/' + hoodie.id(),
				planType: 'prototypoOwnCharge',
				fromStripe: fromStripe
			}
		})
		.done(function(res) {
			console.log(res);
	  		console.log('charge retrieve : success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('charge retrieve : fail');
	  	});
	};

	hoodie.stripe.listCharges = function(username, password, fromStripe) {
		// console.log('> hoodie.account.listCharges');
		$.ajax({
			type: 'get',
			url: '/_api/_plugins/stripe/_api',
			headers: getHeaders(username, password),
			data: {
				subtype: 'charges.list',
				id: username,
				fromStripe: fromStripe,
				planType: 'prototypoOwnSubscription',
				originDb: 'user/' + hoodie.id()
			}
		})
		.done(function(res) {
			console.log(res);
	  		console.log('charges list : success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('charges list : failed');
	  	});
	};

	hoodie.stripe.cleanCouch = function(username, password) {
		$.ajax({
			type: 'get',
			url: '/_api/_plugins/stripe/_api',
			headers: getHeaders(username, password),
			data: {
				subtype: 'cleanCouch'
			}
		})
		.done(function(res) {
			console.log(res);
	  		console.log('databases deletion : success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('databases deletion : failed');
	  	});
	};
});
