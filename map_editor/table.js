function Table(schema, element, on_edit, on_address_update) {
  this.schema_ = schema;
  this.element_ = element;
  this.on_edit_ = on_edit;
  this.on_address_update_ = on_address_update;

  this.table_ = $("<table border='1' width='100%'>");
  this.table_.addClass('google_table');
  $(this.element_).append(this.table_);
}

Table.prototype.setFeature = function(feature) {
  this.table_.html("");

  for (var property in this.schema_) {
    console.log('Property: ', property);
    var tr = $("<tr>");
    
    var td = $("<td>");
    td.addClass('header');
    td.html(property);
    tr.append(td);

    var td = $("<td>");

    // Is this a geometry column?
    if (property == "geometry") {
      td.html("...");
    } else if (property == "address") {
      var properties = feature.properties || {};
      var text = (properties[property] || '');
      td.html(text);
      td.addClass('header');
      
      this.address_cell_ = td;
      td.click(bind(this, this.SelectAddress, tr, td, feature, property));
    } else {
      var properties = feature.properties || {};
      var text = (properties[property] || '');
      td.html(text);

      td.click(bind(this, this.SelectCell, tr, td, feature, property));
    }

    tr.append(td);
    this.table_.append(tr);
  }

  // Bind events.
  // tr.click(bind(this, this.SelectRow, tr, feature.id));
}

Table.prototype.SetAddressEditable = function(b) {
  this.address_editable_ = b;
  if (b) {
    this.address_cell_.removeClass("header");
  } else {
    this.address_cell_.addClass("header");
  }
}

Table.prototype.SelectRow = function(e, tr, id) {
  if (this.selected_) {
    this.selected_.tr.removeClass("highlighted");
  }
  tr.addClass('highlighted');

  // Save the selected row so we can deselect later.
  this.selected_ = {
    tr: tr,
    id: id
  };
}

Table.prototype.SelectCell = function(e, row, cell, feature, property) {
  if (this.selected_cell_ && cell == this.selected_cell_.cell) return;

  var input = $("<input>");
  input.val(cell.html());
  input.blur(bind(this, this.CellBlur, row, cell, feature, property, input));
  input.keypress(bind(this, this.CellKey, cell, feature, property, input));

  cell.html("");
  cell.append(input);
  input.focus();

  this.selected_cell_ = {
    feature: feature,
    cell: cell,
    property: property
  };
}

Table.prototype.SelectAddress = function(e, row, cell, feature, property) {
  console.log('Trying to edit address');

  if (this.selected_cell_ && cell == this.selected_cell_.cell) return;
  if (!this.address_editable_) return;

  console.log('Editing address');

  var input = $("<input>");
  input.val(cell.html());

  this.autocomplete_ = new google.maps.places.Autocomplete(input.get(0));
  google.maps.event.addListener(this.autocomplete_, 'place_changed', bind(this, this.onAutocomplete, cell, input));

  //input.blur(bind(this, this.CellBlur, row, cell, feature, property, input));
  //input.keypress(bind(this, this.CellKey, cell, feature, property, input));

  cell.html("");
  cell.append(input);
  input.focus();

  this.selected_cell_ = {
    feature: feature,
    cell: cell,
    property: property
  };
}

Table.prototype.onAutocomplete = function(cell, input) {
  var place = this.autocomplete_.getPlace();
  this.on_address_update_(place.geometry.location);
  cell.html(input.val());
  this.address_cell_.css('color', 'black');
}

Table.prototype.invalidateAddress = function() {
  this.address_cell_.css('color', 'red');
}

Table.prototype.GetSelectedFeatureId = function() {
  if (!this.selected_) return null;
  return this.selected_.id;
}

Table.prototype.RemoveSelectedRow = function() {
  if (!this.selected_) return null;
  this.selected_.tr.remove();

  this.selected_ = null;
}

Table.prototype.CellBlur = function(e, row, cell, feature, property, input) {
  cell.html(input.val());
  var new_feature = this.on_edit_(this.schema_[property].type, feature, property, input.val());

  // Remove and re-add the row.
  // var new_row = this.AddRow(new_feature);
  // row.replaceWith(new_row);
  // this.selected_.tr = new_row;
}

Table.prototype.CellKey = function(e, cell, feature, property, input) {
  if(e.which == 13) {
    input.blur();
  }
}
