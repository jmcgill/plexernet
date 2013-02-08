// An example of how to use oauth to obtain authorization for a web application
// to display Maps Engine layers readable by a user of that application.
//
// The application follows the following flow:
// 1. When first loaded, the application checks if the user has already
//    authorized this application. If so, a function is called to display
//    the requested layer. This check is asynchronous, so uses callbacks in
//    JavaScript. If the user has authorized the application, an access_token
//    is granted by oauth, which can be used to authenticate when displaying
//    a Maps Engine Layer.
//
// 2. If the user has not authorized this application, an 'Authorize' button
//    is shown in the UI. An oauth flow is started when the user clicks this
//    button. Within this flow, the user is asked if they will grant permission
//    for this application to be able to read their Maps Engine data so that
//    it can be displayed on a Map.
//
// 3. If the user grants authorization to the application, the 'Authorize'
//    button is hidden and the Layer is shown. If not the 'Authorize' button
//    remains visible.
//
// 4. Periodically, the access_token is refreshed by making another call to the
//    oauth library.

// The Client ID for your application, as configured on the Google APIs console.
var clientId = '1003987159328.apps.googleusercontent.com';

// The oauth scope for displaying Maps Engine data.
var scopes = 'https://www.googleapis.com/auth/mapsengine';

// This function is run when the page (including the Maps API and Google APIs
// client libraries) have finished loading.
var OnToken;
var OnRefreshToken;
function initializeAuth(on_token, on_refresh_token) {
  OnToken = on_token;
  OnRefreshToken = on_refresh_token;
  checkAuth(false, handleAuthResult);
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
function checkAuth(prompt_user, callback) {
  var options = {
    client_id: clientId,
    scope: scopes,

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
function handleAuthResult(authResult) {
  var authorizeButton = document.getElementById('authorize_button');

  // Has the user authorized this application?
  if (authResult && !authResult.error) {
    // The application is authorized. Hide the 'Authorization' button.
    authorizeButton.style.display = 'none';
    handleToken(authResult);
  } else {
    // The application has not been authorized. Start the authorization flow
    // when the user clicks the button.
    authorizeButton.style.display = 'block';
    authorizeButton.onclick = handleAuthClick;
  }
}

// This function is called when the user clicks the Authorization button. It
// starts the authorization flow.
function handleAuthClick(event) {
  checkAuth(true, handleAuthResult);
  return false;
}


function handleToken(authResult) {
  // The access_token provided by the oauth flow is only valid for a certain
  // amount of time. Add a timer which will refresh the access_token after this
  // amount of time has elapsed, so that the Layer will continue to work.
  window.setTimeout(refreshToken, authResult.expires_in * 1000);
  OnToken(authResult.access_token);
}

// This function is called once the oauth token has expired. It starts an
// oauth flow in the background which obtains a new token. The user will not
// be prompted to do anything, because we set the 'immediate' property on the
// gapi.auth.authorize request to true.
function refreshToken() {
  checkAuth(false, handleRefreshToken);
}

// This function is called once an expired access_token has been refreshed, and
// a new access_token is available.
function handleRefreshToken(authResult) {
  // Update the token provided to the MapsEngineLayer.
  OnRefreshToken(authResult.access_token);

  // This token will also expire after some time, so create a timer which will
  // refresh it again.
  window.setTimeout(refreshToken, authResult.expires_in * 1000);
}
