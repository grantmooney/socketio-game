window.apiUrl = location.protocol+'//'+((location.hostname == "localhost")?location.hostname:"api.endorphinsoftworks.com");
// Authentication class
function Authentication() {
	var self = this;
	this.token = null;
	this.user = null;
	this.check = function() { return (self.token !== null); }
	this.login = function(input, successCallback, errorCallback) {
		$.ajax({
			type: "POST",
			url: window.apiUrl+'/auth/login',
			data: input,
			success: function(data) {
				self.token = data.token;
				self.user = data.user;
				successCallback(data);
			},
			error: errorCallback
		});
	}
	this.register = function(input, successCallback, errorCallback) {
		console.log(window.apiUrl);
		$.ajax({
			type: "POST",
			url: window.apiUrl+'/auth/register',
			data: input,
			success: function(data) {
				self.token = data.token;
				self.user = data.user;
				successCallback(data);
			},
			error: errorCallback
		});
	}
}

window.Auth = new Authentication();

(function() {
	var $content = $('#content'),
		$errors = $('#errors');

	var loadGame = function(data) {
		if ($('#gameplay').length > 0) { return; }
		$content.before('<div id="gameplay" class="col-xs-12"></div>');
		$.getScript( "js/mmo.js" ).fail(function( jqxhr, settings, exception ) {
		    $content.html("Could not load the game ( "+ exception + " )");
		});
	}

	page('/', index);
	page('/auth/login', login);
	page('/auth/register', register);
	page('/auth/logout', logout)
	page('*', notfound);
	page({ hashbang:true });

	function index() {
		$content.html('Home');
	}

	function login() {
		if (window.Auth.check()) {
			$content.html('Already logged in!');
			return;
		}
		$content.load('pages/login.htm', null, function() {
			var $authForm = $content.find('form');
			$authForm.on('submit', function(e) {
			    e.preventDefault();
				$authForm.hide();
				window.Auth.login( $authForm.serialize(), function(data) {
					loadGame(data);
					$('[auth="false"]').hide();
					$('[auth="true"]').show();
					$('.user_first_name').html(window.Auth.user.first_name);
				}, function(data) {
					$authForm.show();
					$content.html(data);
				});
			    return false;
			});
		});
	}

	function register() {
		if (window.Auth.check()) {
			$content.html('Already logged in!');
			return;
		}
		$content.load('pages/register.htm', null, function() {
			var $authForm = $content.find('form');
			$authForm.on('submit', function(e) {
			    e.preventDefault();
				$authForm.hide();
				window.Auth.register( $authForm.serialize(), function(data) {
					loadGame(data);
					$('[auth="false"]').hide();
					$('[auth="true"]').show();
					$('.user_first_name').html(window.Auth.user.first_name);
				}, function(data) {
					$authForm.show();
					$content.html(data);
				});
			    return false;
			});
		});
	}

	function logout() {
		if (!window.Auth.check()) {
			$content.html('Logged out!');
			return;
		}
		location.reload();
	}

	function notfound() {
		$errors.html('');
		$content.html('<h1>404</h1><p>not found</p>');
	}

	$('[auth="true"]').hide();
	$('[auth="false"]').show();
})();