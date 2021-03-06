// TODO:
// 1. Request feature details, and re-use the Table editing code to render as a vertical row.
// 2. Add an 'edit geometry' button.
// 3. Use Places Auto Complete for address and add a 'Refresh' button.

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
var clientId = '57681607714-aduf3qj266i45g3euj9b8arn22b6fuu3.apps.googleusercontent.com';

// The oauth scope for displaying Maps Engine data.
var scopes = [
    'https://www.googleapis.com/auth/earthbuilder.readonly',
    'https://www.googleapis.com/auth/mapsengine'];

// The Asset ID of the Maps Engine Layer to display.
var layerId = '10258059232491603613-09376608040401646663';

// The ID of the table in this Layer.
var tableId = '10258059232491603613-00550798328153843084';

function bind(scope, fn) {
  var args = Array.prototype.slice.call(arguments, 2);
  return function() {
    return fn.apply(scope, Array.prototype.slice.call(arguments).concat(args));
  }
};

// This function is run when the page (including the Maps API and Google APIs
// client libraries) have finished loading.
var editor_;
function initialize() {
  editor_ = new Editor();
  checkAuth(false, handleAuthResult);

  // Position the failed geocodes element.
  var width = $(window).width();
  $("#failed_geocodes").css('left', (width - 250) + 'px');
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
  console.log("Callback", authResult);
  var authorizeButton = document.getElementById('authorize_button');

  // Has the user authorized this application?
  if (authResult && !authResult.error) {
    // The application is authorized. Hide the 'Authorization' button.
    authorizeButton.style.display = 'none';
    editor_.showMap(authResult.access_token);
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


function Editor() {3
  this.base_ = "https://www.googleapis.com/mapsengine/v1beta2/tables/";
}

// This function is called once handleAuthResult detects that authorization
// has been provided.
Editor.prototype.showMap = function(access_token, expires_in) {
  // Store the access_token
  this.access_token_ = access_token;

  // Create a new Google Maps API Map
  var mapOptions = {
    center: new google.maps.LatLng(0,0),
    zoom: 7,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    disableDefaultUI: true,
  };
  this.map_ = new google.maps.Map(
      document.getElementById("map_canvas"),
      mapOptions);

  var input = document.getElementById('autocomplete');
  this.autocomplete_ = new google.maps.places.Autocomplete(input);
  this.autocomplete_.bindTo('bounds', this.map_);

  google.maps.event.addListener(this.autocomplete_, 'place_changed', bind(this, this.onAutocomplete));

  // Add a Maps Engine Layer to this Map. The access_token granted by the oauth
  // flow is used here to access user data.
  this.layer_ = new google.maps.visualization.MapsEngineLayer({
    layerId: layerId,
    oAuthToken: access_token,
    suppressInfoWindows: true
  });
  this.layer_.setMap(this.map_);

  // Add an event listener which modifies the bounds of the Map to best fit
  // the Layer once the layer has loaded.
  //google.maps.event.addListener(mapsEngineLayer, 'bounds_changed', function() {
  //  map.fitBounds(mapsEngineLayer.get('bounds'));
  //});

  google.maps.event.addListener(this.layer_, 'click', bind(this, this.onFeatureClick));

  // The access_token provided by the oauth flow is only valid for a certain
  // amount of time. Add a timer which will refresh the access_token after this
  // amount of time has elapsed, so that the Layer will continue to work.
  // window.setTimeout(refreshToken, expires_in * 1000);
}

Editor.prototype.onFeatureClick = function(e) {
  // Find all the features in the table.
  var url = this.base_ + tableId + "/features";
  parameters = {
    access_token: this.access_token_,
    where: "name='f" + (parseInt(e.featureId, 10) - 1) + "'"
  };

  jQuery.ajax({
    url: url,
    data: parameters,
    success: bind(this, this.readComplete),
    error: bind(this, this.onApiError)
  });

  if (this.marker_ ) {
    this.marker_.setPosition(e.latLng);
  } else {
    this.marker_ = new google.maps.Marker({
      position: e.latLng,
      map: this.map_
    });
  }
}

Editor.prototype.readComplete = function(result) {
  $("#status_div").html("");

  var table_div = $("<div>");
  $("#status_div").append(table_div);
  this.table_ = new Table(
    result.schema,
    table_div,
    bind(this, this.updateFeature),
    bind(this, this.updateAddress));
  this.table_.setFeature(result.features[0]);

  var msg = $("<div>");
  $("#status_div").append(msg);

  var img = $("<img src='edit_location.png'>");
  $("#status_div").append(img);
  img.addClass('button');
  img.click(bind(this, this.editGeometry, img, msg));
}

Editor.prototype.onApiError = function() {
  alert('Error');
}

Editor.prototype.updateFeature = function(type, feature, property, value) {
  console.log('Saving: ', property, ' value: ', value);
}

Editor.prototype.onDragEnd = function(type, feature, property, value) {
  this.table_.invalidateAddress();
}

Editor.prototype.updateAddress = function(location) {
  this.marker_.setPosition(location);
  this.map_.setCenter(location);
}

Editor.prototype.onAutocomplete = function() {
  var place = this.autocomplete_.getPlace();
  if (place.geometry.viewport) {
    this.map_.fitBounds(place.geometry.viewport);
  } else {
    this.map_.setCenter(place.geometry.location);
    this.map_.setZoom(17);  // Why 17? Because it looks good.
  }
}

Editor.prototype.editGeometry = function(e, img, msg) {
  this.layer_.setMap(null);
  this.marker_.setIcon("http://bubbysbread.com/wordpress/wp-content/uploads/2012/02/blue-map-marker.gif");
  msg.html("Edit the <b>address</b> property or drag the marker to set a new position.");
  img.attr('src', 'save_location.png');
  this.marker_.set('draggable', true);
  google.maps.event.addListener(this.marker_, 'dragend', bind(this, this.onDragEnd));
  this.table_.SetAddressEditable(true);

  img.unbind();
  img.click(bind(this, this.updateFeatureGeography));
}

Editor.prototype.updateFeatureGeography = function(e) {
  // TODO(jmcgill): Do something clever if address and location both change.
  console.log('Saving new location: ', this.marker_.getPosition());
  this.table_.SetAddressEditable(false);
}

// This function is called once the oauth token has expired. It starts an
// oauth flow in the background which obtains a new token. The user will not
// be prompted to do anything, because we set the 'immediate' property on the
// gapi.auth.authorize request to true.
function refreshToken() {
  checkAuth(false, refreshLayer);
}

// This function is called once an expired access_token has been refreshed, and
// a new access_token is available.
function refreshLayer(authResult) {
  // Update the token provided to the MapsEngineLayer.
  mapsEngineLayer.set('oAuthToken', authResult.access_token);

  // This token will also expire after some time, so create a timer which will
  // refresh it again.
  window.setTimeout(refreshToken, expires_in * 1000);
}