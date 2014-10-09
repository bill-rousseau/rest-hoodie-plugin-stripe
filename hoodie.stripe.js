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
	  	console.log('> hoodie.account.signUpStripe');
		console.log(username, password, plan);
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
			}
		})
		.success(function(res) {
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
		console.log(username, password, plan);
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
	  	.done(function() {
	  		console.log('success');
	  	})
	  	.fail(function() {
	  		console.log('update fail');
	  	});
	};

	hoodie.account.retrieveSub = function(username, password, fromStripe) {
	  	console.log('> hoodie.account.retrieveSub');
		console.log(username, password, fromStripe);
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
		.done(function() {
	  		console.log('success');
	  	})
	  	.fail(function() {
	  		console.log('retrieve fail');
	  	});
	}

  //TODO : try to get the StripeCustomerID at the same time
});
