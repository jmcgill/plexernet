// This program uses the Maps Engine API to implement the behaviour of
// the radius search example web page.

// Map variable, so we can add markers to the map.
var map;
var client;
var oauth_token;
//var response;
var response_;
var iw;
var aid="16160248571242627569-09602266792111213588";
var markersArray = [];

// Replace these details with your own.
var authConfig = {
  client_id: '57681607714-ko6v8kjhpl1g2shr86e5g44a4oohuusc.apps.googleusercontent.com',
  scopes: ['https://www.googleapis.com/auth/mapsengine'],
  redirect: 'http://plexer.net/work/map_playground'
};

function initialize() {
  client = new OAuthClientSample(
    authConfig.client_id,
    authConfig.redirect,
    authConfig.scopes);

  // Has this page been loaded with valid credentials?
  var token = client.getAccessToken(handleAccessToken);
}

function handleAccessToken(token) {
  if (!token) {
    client.requestAccessToken();
    return;
  }

  // The token has been verified, so we can now cache it.
  oauth_token = token;
  var desat = [
  {
    "stylers": [
      { "saturation": -100 }
    ]
  }
  ];

  // Create the map
  var mapOptions = {
    zoom: 8,
    center: new google.maps.LatLng(40, -76),
    disableDefaultUI: true,
    panControl: false,
    zoomControl: false,
    mapTypeControl: true,
    scaleControl: false,
    streetViewControl: false,
    overviewMapControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    styles: desat
  };
  map = new google.maps.Map(document.getElementById('map_canvas'),
            mapOptions);
  


  var drawingManager = new google.maps.drawing.DrawingManager({
  drawingControl: true,
  drawingControlOptions: {
    position: google.maps.ControlPosition.TOP_CENTER,
    drawingModes: [
      google.maps.drawing.OverlayType.MARKER
    ]
  }});
  drawingManager.setMap(map);

  google.maps.event.addListener(drawingManager, 'markercomplete', function(marker) {
    var position = marker.getPosition();
    var fid = Math.round(Math.random() * Math.pow(2, 32));
	//attributes for new marker
    var mutation = 
    {
      features: [
        {
          id: "" + fid,
          geometry: {
            type: "Point",
            coordinates: [position.lng(), position.lat()],
            columnName: "geometry"
          },
          properties: {
		  }
        }
      ]
    };
	marker.set('icon', 'http://maps.google.com/mapfiles/ms/micons/blue-dot.png');
	//append the mutation attributes to the marker added to the map
	marker.set('attributes', mutation.features[0]);
	marker.set('draggable', true);
	marker.set('index', markersArray.length);
	markersArray.push(marker); //just in case they need deleting
	
	google.maps.event.addListener(marker, 'click', function(e){
		showInfoWindow(this);
	});
	
    google.maps.event.addListener(marker, 'dragend', function(m) {
      return function() {
        updateLocation(m);
      }
    }(marker));

    // create the batchInsert request body.
    var url = "https://www.googleapis.com/mapsengine/v1beta2/tables/" + aid + "/features/batchInsert";
	sendRequest(url, mutation, addComplete, function() { addFailed(marker); });
  });

  // Find all the features in the table.
  var url = "https://www.googleapis.com/mapsengine/v1beta2/tables/" + aid + "/features";
  parameters = {
    access_token: oauth_token,
    maxResults: 500
  };

  jQuery.ajax({
    url: url,
    data: parameters,
    success: handleApiResponse,
    error: handleApiError
   });
}

function handleApiResponse(response){
  response_ = response;
  for (var i = 0; i < response.features.length; ++i) {
    var marker = new google.maps.Marker({
      position: new google.maps.LatLng(response.features[i].geometry.coordinates[1], response.features[i].geometry.coordinates[0]),
      map: map,
      draggable: true,
	  index: i,
	  attributes: response.features[i]
    });
	markersArray.push(marker); //just in case we need to delete them all

    google.maps.event.addListener(marker, 'click', function(e) {
        showInfoWindow(this);
    });


    google.maps.event.addListener(marker, 'dragend', function(m) {
      return function() {
        updateLocation(m);
      }
    }(marker));
  }

  return;

  if (response.nextPageToken) {
  var url = "https://www.googleapis.com/mapsengine/v1beta2/tables/" + aid + "/features";
  parameters = {
    access_token: oauth_token,
    maxResults: 500,
    pageToken: response.nextPageToken
  };


  jQuery.ajax({
    url: url,
    data: parameters,
    success: handleApiResponse,
    error: handleApiError
   });
  }
}

function deleteOverlays(i) {
  if (markersArray) {
      markersArray[i].setMap(null);
  }
}
function updateLocation(feature) {
  var location = feature.getPosition();
  var mutation = {
    features: [
      {
        id: feature.attributes.id,
        geometry: {
          type: 'Point',
          coordinates: [location.lng(), location.lat()],
          columnName: 'geometry'
        },
        properties: {}
      }
    ]
  }


  var url = "https://www.googleapis.com/mapsengine/v1beta2/tables/" + aid + "/features/batchPatch";
  sendRequest(url, mutation, handleEditResponse);
}

function handleEditResponse() {
  message("Saved");
}

function updateValue(property, val, feature) {
  p = {}
  p[property] = val;

  //update marker
  feature.attributes.properties = p;
  
  //udpate GME
  var mutation = {
    features: [
      {
        id: feature.attributes.id,
        properties: p
      }
    ]
  }

  var url = "https://www.googleapis.com/mapsengine/v1beta2/tables/" + aid + "/features/batchPatch";
  sendRequest(url, mutation, handleEditResponse);
}

function deleteRecord(index) {
  //udpate GME
  var id =  markersArray[index].attributes.id;
  deleteOverlays(index);
  var mutation = {
    featureIds: [ 
         id
    ]
  }

  var url = "https://www.googleapis.com/mapsengine/v1beta2/tables/" + aid + "/features/batchDelete";
  sendRequest(url, mutation, handleDeleteResponse);
}

function showInfoWindow(feature) {
  var table = $("<table style='margin: 5px;'>");
  var index = feature.index;
  for (var property in response_.schema) {
    var tr = $("<tr>");
    table.append(tr);

    var td = $("<td>");
    td.html(property);
    tr.append(td); 

    var td = $("<td>");
    var input = $("<input>");
	if (JSON.stringify(feature.attributes.properties) != "null"){
		input.val(feature.attributes.properties[property]);
	}
	
    input.change(function(property_, input_, feature) { return function(e) {
      updateValue(property_, input_.val(), feature);
    } }(property, input, feature));

    td.append(input);
    tr.append(td);
  }
  var tr = $("<tr>");
  table.append(tr);

  var td = $("<td>");
  tr.append(td); 
  var td = $("<td>");  
  var inputButton = "<input type='button' value='Delete' id='delete' onclick='deleteRecord(" + index + ")'/>";
  td.html(inputButton);
  tr.append(td);   

  if (iw) {
    iw.close();
  }

  iw = new google.maps.InfoWindow({
    content: "<div id='iw'/>"
  }); 
  iw.open(map, feature);
  var once = false;

  google.maps.event.addListener(iw, 'domready', function() {
    return function() {
      $("#iw").append(table);
      if (!once) { iw.set('content', $("#iw").get(0)); once = true; }
    }
  }());
}

function handleApiError(obj, textStatus, errorThrown) {
  var response = JSON.parse(obj.responseText);
  var str = JSON.stringify(response, undefined, 2);
  alert('An error occured - see the Javascript Console for deatils.');
}

function handleEditResponse(response) {
  message('Saved!');
}

function handleDeleteResponse(response) {
  message('Deleted!');
  if (iw) {
    iw.close();
  }
}

function message(text) {
  $("#message").html(text);
  window.setTimeout(function() { $("#message").html(""); }, 2000);
}

function sendRequest(url, request, done, error) {
  jQuery.ajax({
    type: 'POST',
    url: url,
    dataType: 'json',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + oauth_token },
    data: JSON.stringify(request),
    success: function(inner_done) { return function(data) { requestComplete(data, inner_done); } }(done),
    error: function(inner_done) { return function(data) { requestError(data, inner_done); } }(error),
  });

  $("#inner").html(url.replace(/\//g, '/<wbr>'));
  $("#request").html(JSON.stringify(request, undefined, 2));
  $("#loading").css('display', 'block');
  $("#bar").css('display', 'block');
  $("#response").html("");
}

function requestComplete(data, done) {
  $("#loading").css('display', 'none');
  $("#response").html("200\n" + JSON.stringify(data, undefined, 2));
  done(data); 
}

function requestError(data, done) {
  $("#loading").css('display', 'none');
  $("#response").html(
    data.status + "\n" +
    JSON.stringify(JSON.parse(data.responseText), undefined, 2));
  if (done) done(data);
}

function addComplete() {
}

function addFailed(marker) {
  marker.setMap(null);
}
