// This program uses the Maps Engine API to implement the behaviour of
// the radius search example web page.

// Map variable, so we can add markers to the map.
var map;
var client;
var oauth_token;

// Replace these details with your own.
var authConfig = {
  client_id: '57681607714-aduf3qj266i45g3euj9b8arn22b6fuu3.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/mapsengine.readonly'],
  redirect: 'http://plexer.net/work/playground'
};

function initialize() {
  client = new OAuthClientSample(
    authConfig.client_id,
    authConfig.redirect,
    authConfig.scopes);

  // Has this page been loaded with valid credentials?
  var token = client.getAccessToken(handleAccessToken);

  // Listen to modifications to the input.
  $("#query").keyup(displayQuery);
}

function displayQuery() {
  var query = $("#query").val();
  var output = [];

  // Syntax colors
  var kId = 'red';
  var kArgument = 'green';
 
  // Split by component.
  var parts = query.split('?');
  var path = parts[0];

  var components = path.split('/');
  for (var i = 0; i < components.length; ++i) {
    if (/[0-9-]+/.test(components[i])) {
      output.push(highlight(components[i], kId)); 
    } else {
      output.push(components[i]);
    }
  }
  output = [output.join('/')]

  if (parts.length > 1) { 
    var output_args = [];
    var args = parts[1].split('&');
    for (var i = 0; i < args.length; ++i) {
      var x = args[i].split('=');
      output_args.push(highlight(x[0], kArgument) + '=' + x[1]);
    }
    output.push(output_args.join('&')); 
  }

  $("#highlighted_query").html(output.join('?'));   
}

function highlight(text, color) {
  return '<span style="color: ' + color + '">' + text + '</span>'
}

function handleAccessToken(token) {
  if (!token) {
    client.requestAccessToken();
    return;
  }

  // The token has been verified, so we can now cache it.
  oauth_token = token;
}

// Perform a query.
function runQuery(e) {
  var query = $("#query").prop('value');
  var url = "https://www.googleapis.com/mapsengine/" + query;

  parameters = {
    access_token: oauth_token,
  };
    
  var email = $("#email").val();
  if (email) {
    parameters['trace'] = 'email:' + email;
  }

  jQuery.ajax({
    url: url,
    data: parameters,
    success: handleApiResponse,
    error: handleApiError
   });

  return false;
}

function handleApiResponse(response) {
  var str = JSON.stringify(response, undefined, 2);
  $("#output").html(str);  
}

function handleApiError(obj, textStatus, errorThrown) {
  var response = JSON.parse(obj.responseText);
  var str = JSON.stringify(response, undefined, 2);
  $("#output").html(str);
}
