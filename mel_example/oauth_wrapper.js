// OAuth Wrapper Prototype

function bind(scope, fn) {
  var args = Array.prototype.slice.call(arguments, 2);
  return function() {
    return fn.apply(scope, Array.prototype.slice.call(arguments).concat(args));
  }
};

function OAuthWrapper(clientId, scope, uiElement) {
  this.clientId = clientId;
  this.scope = scope;
  this.uiElement = uiElement;
  console.log('UI element: ', this.uiElement);
}

OAuthWrapper.prototype.authorize = function(onComplete, onRefresh) {
  // TODO(jmcgill): Pass these around with closures.
  this.onComplete = onComplete;
  this.onRefresh = onRefresh;

  this.checkAuth(false, bind(this, this.handleAuthResult));
}

// A shared function which checks if the user has previously authorized this
// application, and if so calls the supplied callback.
// This function should always be called before calling a function which
// requires an oauth access_token.
//
// If prompt_user is true, the user will be prompted to provide access. This
// should not be set to true unless this function was triggered by a user
// action (e.g. clicking a button).
//
// If prompt_user is set to false, and the user is not authorized, the callback
// will be called with null.
OAuthWrapper.prototype.checkAuth = function(prompt_user, callback) {
  var options = {
    client_id: this.clientId,
    scope: this.scopes,

    // Setting immediate to 'true' will avoid prompting the user for
    // authorization if they have already granted it in the past.
    immediate: !prompt_user
  }

  // Check to see if the current user has authorized this application.
  gapi.auth.authorize(options, callback);
}

// A callback run after checking if the user has authorized this application.
// If they have not, then authResult will be null, and a button will be
// displayed which the user can click to begin authorization.
//
// Authorization can only be started in response to a user action (such as
// clicking a button) in order to avoid triggering popup blockers.
OAuthWrapper.prototype.handleAuthResult = function(authResult) {
  console.log('Handle auth result');

  // Has the user authorized this application?
  if (authResult && !authResult.error) {
    window.setTimeout(
    	bind(this, this.refreshToken),
    	authResult.expires_in * 1000);

    console.log('Calling callback');
    this.onComplete(authResult);
  } else {
  	console.log('Missing auth');
    // The application has not been authorized. Start the authorization flow
    // when the user clicks the button.
    var me = this;
    this.uiElement.onclick = function() {
      console.log('Handling click');
      me.checkAuth(true, bind(me, me.handleAuthResult));
      return false;
    }
  }
}

// This function is called once the oauth token has expired. It starts an
// oauth flow in the background which obtains a new token. The user will not
// be prompted to do anything, because we set the 'immediate' property on the
// gapi.auth.authorize request to true.
OAuthWrapper.prototype.refreshToken = function() {
  this.checkAuth(false, bind(this, this.refreshComplete));
}

// This function is called once an expired access_token has been refreshed, and
// a new access_token is available.
OAuthWrapper.prototype.refreshComplete = function(authResult) {
  // This token will also expire after some time, so create a timer which will
  // refresh it again.
  window.setTimeout(bind(this, this.refreshToken), authResult.expires_in * 1000);
  this.onRefresh(authResult);
}