Hoodie.extend(function (hoodie, lib, utils) {
  'use strict';

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

  // extend the hoodie.js API
  	hoodie.account.signUpWith = function (username, password) {
		console.log('> hoodie.account.signUpWith');
		// validateType(type);
		return hoodie.account.signUp(username, password)
		  .done(function() {
		  	console.log('User ' + username + ' logged successfully');
		  })
		  .fail(handleSignUpError);
  	};

	hoodie.account.signUpStripe = function(username, password, stripeToken, plan) {
	  	plan = handleFreePlan(plan);
	  	console.log(hoodie.id());
	  	console.log('> hoodie.account.signUpStripe');
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
				originDb: 'user/' + hoodie.id()
			},
			contentType: 'application/json'
		})
		.done(function(res) {
			console.log(res);
			console.log('Stripe Customer created successfully');
		})
		.fail(function(res) {
			console.log(res);
			console.log('Stripe Customer failed')
		});
	};

	hoodie.account.updateSub = function(username, password, plan) {
		plan = handleFreePlan(plan);
	  	console.log('> hoodie.account.updateSub');
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

	hoodie.account.retrieveSub = function(username, password, fromStripe) {
	  	console.log('> hoodie.account.retrieveSub');
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
		.done(function(res) {
			console.log(res);
	  		console.log('retrieve success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('retrieve failed');
	  	});
	};

	hoodie.account.cancelSub = function(username, password) {
		console.log('> hoodie.account.cancelSub');
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

	hoodie.account.listSubs = function(username, password, fromStripe) {
		console.log('> hoodie.account.listSubs');
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
	  		console.log('retrieve success');
	  	})
	  	.fail(function(res) {
			console.log(res);
	  		console.log('retrieve failed');
	  	});
	};

	hoodie.account.createCharge = function(username, password, stripeToken, amount, currency) {
		console.log('> hoodie.account.createCharge');
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

	hoodie.account.retrieveCharge = function(username, password, fromStripe) {
		console.log('> hoodie.account.retrieveCharge');
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

	hoodie.account.listCharges = function(username, password, fromStripe) {
		console.log('> hoodie.account.listCharges');
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
	}
});
