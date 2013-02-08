// TODO(jmcgill): Link to a single-feature map editor on geometry click.

// Map variable, so we can add markers to the map.
var client;
var oauth_token;

function bind(scope, fn) {
  var args = Array.prototype.slice.call(arguments, 2);
  return function() {
    return fn.apply(scope, Array.prototype.slice.call(arguments).concat(args));
  }
};

var editor;
function initialize() {
  editor = new Editor();
  editor.initialize();
}

function Editor() {
  this.base_ = "https://www.googleapis.com/mapsengine/v1beta2/tables/";
}

Editor.prototype.initialize = function() {
  var fn = bind(this, this.handleAccessToken);
  initializeAuth(fn, fn);
}

Editor.prototype.handleAccessToken = function(token) {
  // The token has been verified, so we can now cache it.
  this.token_ = token;

  // Find all the features in the table.
  var url = this.base_ + "10258059232491603613-13364521397325580695/features";
  parameters = {
    access_token: this.token_
  };

  jQuery.ajax({
    url: url,
    data: parameters,
    success: bind(this, this.readComplete),
    error: bind(this, this.handleApiError)
  });
}

Editor.prototype.loadNextPage = function() {
  if (!this.next_page_token_) return;

  var url = this.base_ + "10258059232491603613-13364521397325580695/features";
  parameters = {
    access_token: this.token_,
    pageToken: this.next_page_token_
  };

  jQuery.ajax({
    url: url,
    data: parameters,
    success: bind(this, this.pagedReadComplete),
    error: bind(this, this.handleApiError)
  });
}

// A Table read has been completed for the first time.
Editor.prototype.readComplete = function(response) {
  this.table_ = new Table(response.schema, $("#table"), bind(this, this.saveProperty));
  this.table_.SetData(response.features);
  this.next_page_token_ = response.nextPageToken; 

  // Bind UI.
  var me = this;
  $("#add_a_row").click(function() {
    me.table_.AddEmptyRow();
  });
  
  $("#delete_a_row").click(bind(this, this.deleteSelectedFeature));
  $("#next").click(bind(this, this.loadNextPage));
}

// A Table read has been completed for the second+ time.
Editor.prototype.pagedReadComplete = function(response) {
  this.table_.SetData(response.features);
  this.next_page_token_ = response.nextPageToken; 
}

// An unexpected error has occured.
Editor.prototype.handleApiError = function(obj, textStatus, errorThrown) {
  var response = JSON.parse(obj.responseText);
  var str = JSON.stringify(response, undefined, 2);
  alert('An error occured - see the Javascript Console for deatils.');
  window.console.log(str);
}

// TODO(jmcgill): Remove unused parameters.
Editor.prototype.saveProperty = function(type, feature, property, value) {
  // Are we updating an existing feature?
  if (feature) {
    patch_feature = {
      id: feature.id,
      properties: {}
    }

    if (type == 'number') {
      patch_feature.properties[property] = parseFloat(value);
      feature.properties[property] = parseFloat(value);
    } else {
      patch_feature.properties[property] = value;
      feature.properties[property] = value;
    }
    this.updateFeature(patch_feature);
    return feature; 
  }

  // We are creating a new feature. 
  feature = {
    "type": "Feature",
    id: '' + Math.random(),
    geometry: {
      "type": "Point",
      "coordinates": [0.0, 0.0],
    },
    properties: {}
  }

  if (type == 'number') {
    feature.properties[property] = parseFloat(value);
  } else {
    feature.properties[property] = value;
  }
  this.insertFeature(feature);
  return feature; 
}

Editor.prototype.updateFeature = function(feature) {
  var mutation = {
    "features": [feature],
  };

  var url = this.base_ + "10258059232491603613-13364521397325580695/features/batchPatch";
  jQuery.ajax({
    type: 'POST',
    url: url,
    dataType: 'json',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + this.token_ },
    data: JSON.stringify(mutation),
    success: bind(this, this.updateFeatureComplete),
    error: bind(this, this.handleApiError)
  });
}

Editor.prototype.updateFeatureComplete = function() {
  console.log('Update complete');
}

Editor.prototype.insertFeature = function(feature) {
  var mutation = {
    "features": [feature],
  };

  var url = this.base_ + "10258059232491603613-13364521397325580695/features/batchInsert";
  jQuery.ajax({
    type: 'POST',
    url: url,
    dataType: 'json',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + this.token_ },
    data: JSON.stringify(mutation),
    success: bind(this, this.insertFeatureComplete),
    error: bind(this, this.handleApiError)
  });
}

Editor.prototype.insertFeatureComplete = function() {
  console.log('Insert complete');
}

Editor.prototype.deleteSelectedFeature = function() {
  console.log('Deleting');
  var selected_id = this.table_.GetSelectedFeatureId();
  console.log('Deleting ID: ', selected_id);
  if (!selected_id) return;

  var mutation = {
    "featureIds": [selected_id],
  };

  var url = this.base_ + "10258059232491603613-13364521397325580695/features/batchDelete";
  jQuery.ajax({
    type: 'POST',
    url: url,
    dataType: 'json',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + this.token_ },
    data: JSON.stringify(mutation),
    success: bind(this, this.deleteFeatureComplete),
    error: bind(this, this.handleApiError)
  });  
}

Editor.prototype.deleteFeatureComplete = function() {
  console.log('Deletion complete');
  this.table_.RemoveSelectedRow();
}
