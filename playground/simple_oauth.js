// A simple example of the client-side OAuth 2.0 flow, for accessing
// Google APIs.

function OAuthClientSample(client_id, redirect_uri, scopes) {
  this.client_id = client_id;
  this.redirect_uri = redirect_uri;
  this.scopes = scopes;
}

OAuthClientSample.prototype.requestAccessToken = function() {
  var base_url = "https://accounts.google.com/o/oauth2/auth?";
  var parameters = {
    response_type: 'token',
    client_id: this.client_id,
    redirect_uri: this.redirect_uri,
    scope: this.scopes.join(' '),
    approval_prompt: "force"
  };

  // Turn the above set of parameters into a properly escaped URL.
  var parameter_strings = [];
  for (var parameter in parameters) {
    parameter_strings.push(parameter + '=' + parameters[parameter]);
  }
  var uri = encodeURI(base_url + parameter_strings.join('&'));

  // Redirect to this URI to get permissions from the user.
  window.location.href = uri;
};

OAuthClientSample.prototype.getAccessToken  = function(callback) {
  var query_string = location.hash.substring(1);
  var parameters = {};

  // Components in the hash string returned are delimited by '&''
  var components = query_string.split('&');
  for (var component in components) {
    // Each component is of the form key = value.
    var parts = components[component].split('=');
    parameters[parts[0]] = parts[1];
  }

  // Did the oAuth flow return an error?
  if (parameters["error"]) {
    window.console.log("Error during oAuth flow: " + parameters["error"]);
    callback(null);
  }

  // Did the oAuth flow return a valid OAuth token?
  if (!parameters["access_token"]) {
    callback(null);
  }

  // The token must be validated, to ensure that this application is
  // not left open to CSRF attacks.
  var validation_url = "https://www.googleapis.com/oauth2/v1/tokeninfo?";
  validation_url += "access_token=" + parameters["access_token"];
  jQuery.getJSON(validation_url, function(data) {
    if (data["audience"] == authConfig.client_id) {
      callback(parameters["access_token"]);
    } else {
      callback(null);
    }
  });
};
