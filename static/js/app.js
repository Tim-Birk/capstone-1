const LG_SCREEN_BRKPT = 750;
const NUM_RESULTS = 10;
let CURRENT_LAT;
let CURRENT_LON;
let GEOCODER;
let MAP;
let CURRENT_MARKERS = [];
let RESTROOM_RESULTS = new Map();
let HAS_LOCATION = false;

const $sidebar = $('#sidebar');
const $saveSearchesContainer = $('#saved-searches-container');
const $restroomContainer = $('#restroom-container');
const $mobileSpinnerContainer = $('#mobile-spinner-container');
const $spinnerContainer = $('#spinner-container');
const $searchesList = $('#searches-list');
const $toggleSavedSearchesButton = $('#menu-toggle');
const $saveSearchCheckbox = $('#save-search');
const $saveSearchModalButton = $('#save-search-button');
const $searchName = $('#search-name');
const $defaultSearch = $('#default-search');
const $searchButton = $('#search-button');
const $filterAccessible = $('#accessible');
const $filterUnisex = $('#unisex');
const $filterChangingTable = $('#changing-table');
const $locationSearchContainer = $('#location-search-container');
const $mapContainer = $('#map-container');
const $mapElement = $('#map');
const $resultsContainer = $('#results-container');
const $searchResults = $('#search-results');
const $geocoderDiv = $('#geocoder');
const $editSavedSearchButton = $('#edit-save-search-button');
const $deleteSavedSearchButton = $('#delete-save-search-button');
const $editSearchName = $('#edit-search-name');
const $editDefaultSearch = $('#edit-default-search');
const $editAccessible = $('#edit-accessible');
const $editUnisex = $('#edit-unisex');
const $editChangingTable = $('#edit-changing-table');

// search button event handler
$searchButton.on('click', (evt) => {
  evt.preventDefault();

  if (!GEOCODER.inputString || !GEOCODER.lastSelected) {
    $searchButton.attr('data-target', '');
    alert('Please enter a location to search.');
    return;
  }
  if ($saveSearchCheckbox.is(':checked')) {
    $searchButton.attr('data-target', '#saved-search-modal');
    $searchName.val('');
    return;
  } else {
    $searchButton.attr('data-target', '');
  }
  handleGetSearchResults();
});

// more info button event handler to open restrooms modal
$('#search-container').on('click', 'a', async (evt) => {
  const id = $(evt.target).attr('data-restroom-id');
  if (!id) return;

  const restroom = RESTROOM_RESULTS.get(Number(id));
  showRestroomModal(restroom);
});

// save search button event handler on saved search modal
$saveSearchModalButton.on('click', async (evt) => {
  if ($searchName.val() == '') {
    alert('Enter a Search Name');
    return;
  }

  const name = $searchName.val();
  const use_current_location = false; //deprecated so hardcode to false
  const coordinates = getCoordinates();
  const lon = coordinates.lon;
  const lat = coordinates.lat;

  let location_search_string = '';
  if (!use_current_location) {
    let result = JSON.parse(GEOCODER.lastSelected);
    location_search_string = result.place_name;
  }
  const is_default = $defaultSearch.is(':checked');
  const accessible = $filterAccessible.is(':checked');
  const unisex = $filterUnisex.is(':checked');
  const changing_table = $filterChangingTable.is(':checked');

  const savedSearch = {
    name,
    use_current_location,
    lon,
    lat,
    location_search_string,
    is_default,
    accessible,
    unisex,
    changing_table,
  };

  // add saved search to database
  const resp = await axios.post(`/search/add`, savedSearch);
  const newSavedSearch = resp.data.saved_search;

  if (!newSavedSearch) {
    return;
  }

  $saveSearchCheckbox.prop('checked', false);
  $searchButton.attr('data-target', '');

  // add saved search to sidebar list
  const searchListItem = $(`
  <div
    class="list-group-item list-group-item-action bg-light d-flex justify-content-between align-items-center"
  >
    <a
      href="#"
      class="list-group-item-action bg-light search-item"
      data-search-id="${newSavedSearch.id}"
    >
      ${newSavedSearch.name}
    </a>
    <div class="d-flex justify-content-end">
      <a
        id="saved-search-edit"
        class="dropdown-item text-primary px-0 ml-3"
        data-toggle="modal"
        data-target="#edit-saved-search-modal"
        data-search-id="${newSavedSearch.id}"
        href="#"
      >
        <i class="fas fa-pencil-alt" data-search-id="${newSavedSearch.id}"></i>
      </a>
      <a
        id="saved-search-delete"
        class="dropdown-item text-danger px-0 ml-3"
        data-toggle="modal"
        data-target="#delete-saved-search-modal"
        data-search-id="${newSavedSearch.id}"
        href="#"
      >
        <i class="fas fa-trash" data-search-id="${newSavedSearch.id}"></i>
      </a>
    </div>
  </div>
`);

  $searchesList.append(searchListItem);

  handleGetSearchResults();
});

// toggles save search sidebar on click event
$toggleSavedSearchesButton.on('click', async (evt) => {
  evt.preventDefault(evt);
  $('#wrapper').toggleClass('toggled');
});

// populates search filters with saved search that is clicked
$searchesList.on('click', 'a', async (evt) => {
  $saveSearchesContainer.children('.dropdown').remove();
  const search_id = $(evt.target).attr('data-search-id');

  const resp = await axios.get(`/search/${search_id}`);
  const savedSearch = resp.data.saved_search;

  clearMapMarkers();
  populateSearchFilters(savedSearch);
});

$('#sidebar-wrapper').on('click', async (evt) => {
  $('#wrapper').toggleClass('toggled');
});

// saved search event handler for opening edit/delete modal
$searchesList.on('click', '#saved-search-edit', async (evt) => {
  const id = $(evt.target).attr('data-search-id');
  if (!id) return;
  const resp = await axios.get(`/search/${id}`);
  const savedSearch = resp.data.saved_search;

  showEditSavedSearchModal(savedSearch);
});

// save search button event handler on edit saved search modal
$editSavedSearchButton.on('click', async (evt) => {
  const id = $(evt.target)
    .closest('#edit-saved-search-modal')
    .attr('data-search-id');
  if (!id) return;

  if ($editSearchName.val() == '') {
    alert('Enter a Search Name');
    return;
  }

  const name = $editSearchName.val();
  const is_default = $editDefaultSearch.is(':checked');
  const accessible = $editAccessible.is(':checked');
  const unisex = $editUnisex.is(':checked');
  const changing_table = $editChangingTable.is(':checked');

  const savedSearch = {
    name,
    is_default,
    accessible,
    unisex,
    changing_table,
  };

  // update saved search in database
  const resp = await axios.post(`/search/${id}`, savedSearch);
  const updatedSavedSearch = resp.data.saved_search;

  if (!updatedSavedSearch) {
    return;
  }

  // reload form after update to display flash message from server
  location.reload();
});

// delete search event handler for opening delete modal to confirm delete
$searchesList.on('click', '#saved-search-delete', async (evt) => {
  const id = $(evt.target).attr('data-search-id');
  if (!id) return;
  $('#delete-saved-search-modal').attr('data-search-id', id);
});

// delete search button event handler on edit saved search modal
$deleteSavedSearchButton.on('click', async (evt) => {
  const id = $(evt.target)
    .closest('#delete-saved-search-modal')
    .attr('data-search-id');
  if (!id) return;

  await axios.delete(`/search/${id}`);

  // reload form after update to display flash message from server
  location.reload();
});

// gets users default search from api and fills search form with saved search parameters
const fillDefaultSearch = async () => {
  const search_id = $('#search-form').attr('data-default-id');
  if (!search_id) {
    return;
  }
  const resp = await axios.get(`/search/${search_id}`);
  const savedSearch = resp.data.saved_search;

  populateSearchFilters(savedSearch);
};

// populates search filters with saved search
const populateSearchFilters = (savedSearch) => {
  const {
    id,
    name,
    accessible,
    unisex,
    changing_table,
    location_search_string,
    lat,
    lon,
  } = savedSearch;

  if (location_search_string) {
    refreshMap(lat, lon);
    GEOCODER.query(location_search_string);
    GEOCODER.inputString = location_search_string;
  }

  $filterAccessible.prop('checked', accessible);
  $filterUnisex.prop('checked', unisex);
  $filterChangingTable.prop('checked', changing_table);
};

const handleGetSearchResults = async () => {
  // clear previous search results
  $searchResults.empty();

  showLoadingSpinner();

  // clear existing results in global list of restroom results
  RESTROOM_RESULTS.clear();

  // clear existing markers from map
  clearMapMarkers();

  // get coordinates based on current search criteria
  const coordinates = getCoordinates();

  adjustMapForDeviceSize(coordinates.lat, coordinates.lon);

  // move map over to display search results next to it on larger devices
  $mapContainer.addClass('col-md-8');
  $mapContainer.addClass('map-large');
  $mapElement.addClass('map-large');

  await getRestroomsDisplayResults(coordinates.lat, coordinates.lon);

  hideLoadingSpinner();

  handleNoResults();
};

const showLoadingSpinner = () => {
  // remove existing spinner (if restart)
  $mobileSpinnerContainer.children().remove();
  $spinnerContainer.children().remove();
  $searchResults.hide();

  // for smaller devices display spinner at the above the map
  if ($(window).width() < LG_SCREEN_BRKPT) {
    // create a spinner
    const $spinner = $(`
      <div id="spinner" class="d-flex justify-content-center mt-2">
          <div class="spinner-border text-primary" style="width: 2rem; height: 2rem;" role="status">
          <span class="sr-only">Loading...</span>
          </div>
      </div>`);

    $mobileSpinnerContainer.append($spinner);
  } else {
    const $spinner = $(`
      <div id="spinner" class="d-flex justify-content-center mt-5">
          <div class="spinner-border text-primary" style="width: 5rem; height: 5rem;" role="status">
          <span class="sr-only">Loading...</span>
          </div>
      </div>`);
    // for larger devices show spinner where search results will appear on left hand side
    $spinnerContainer.append($spinner);
  }
};

const hideLoadingSpinner = () => {
  $('#spinner').remove();
  $searchResults.show();
};

const handleNoResults = () => {
  // if no results display message to user
  if (RESTROOM_RESULTS.size === 0) {
    const $message = $(
      '<p class="text-danger my-1"><b>No results found.</b></p>'
    );
    if ($(window).width() < LG_SCREEN_BRKPT) {
      $mobileSpinnerContainer.append($message);
    } else {
      // for larger devices show spinner where search results will appear on left hand side
      $spinnerContainer.append($message);
    }
  }
};

const getCoordinates = () => {
  // By default use Current User Coordinates
  let coords = {
    lat: CURRENT_LAT,
    lon: CURRENT_LON,
  };

  // if Use Current Location is not checked, use mapbox last search result
  if (GEOCODER.lastSelected) {
    let result = JSON.parse(GEOCODER.lastSelected);
    const { coordinates } = result.geometry;
    coords.lat = coordinates[1];
    coords.lon = coordinates[0];
  }

  return coords;
};

// Gets restroom info and displays map markers on map and search results in list
const getRestroomsDisplayResults = async (lat, lon) => {
  // get extra results from api in case user requests changing table filter
  const extraResults = 10;
  const per_page = NUM_RESULTS + extraResults;

  // get restroom listings from Refuge API
  return axios
    .get(
      `https://www.refugerestrooms.org/api/v1/restrooms/by_location?lat=${lat}&lng=${lon}&ada=${$filterAccessible.is(
        ':checked'
      )}&unisex=${$filterUnisex.is(':checked')}&per_page=${per_page}`
    )
    .then(async (resp) => {
      let restrooms = resp.data;

      // attempt to get additional detail data from Google Places API
      for (let idx = 0; idx < restrooms.length; idx++) {
        const restroom = { ...restrooms[idx] };

        // check if changing table filter is applied (can't be filtered thru api)
        if ($filterChangingTable.is(':checked') && !restroom.changing_table) {
          continue;
        }

        const data = {
          name: restroom.name,
          lat: restroom.latitude,
          lon: restroom.longitude,
        };

        const detailResp = await axios.post('/api/places', data);
        const details = detailResp.data.detail.result;

        restroom.details = { ...details };
        restroom.list_number = RESTROOM_RESULTS.size + 1;

        RESTROOM_RESULTS.set(restroom.id, restroom);

        // add restroom marker to map
        addMarkerToMap(restroom);

        // add to search results list
        addRestroomLiToDOM(restroom);

        // after visible results are added, hide spinner
        let visibleResults = 3; // Default height shows 3 results
        if ($(window).height() > 950) {
          visibleResults = 5; // Largest height shows 5 results
        } else if ($(window).height() > 800) {
          visibleResults = 4; // Medium height shows 4 results
        }

        if (RESTROOM_RESULTS.size === visibleResults) {
          hideLoadingSpinner();
        }

        // check if requested number of results has been met
        if (RESTROOM_RESULTS.size === NUM_RESULTS) {
          hideLoadingSpinner();
          break;
        }
      }
      return restrooms;
    })
    .catch((err) => {
      console.log(err);
    });
};

const addMarkerToMap = (restroom) => {
  const {
    list_number,
    id,
    name,
    longitude,
    latitude,
    street,
    city,
    state,
    distance,
    details,
    accessible,
    unisex,
    changing_table,
  } = restroom;

  const marker = {
    type: 'Feature',
    properties: {
      message: name,
      iconSize: [20, 20],
    },
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude],
    },
  };
  var el = document.createElement('div');
  el.className = 'marker';
  el.innerText = list_number;
  el.style.backgroundColor = 'plum';
  el.style.width = marker.properties.iconSize[0] + 'px';
  el.style.height = marker.properties.iconSize[1] + 'px';

  // add marker to map
  const newMarker = new mapboxgl.Marker(el)
    .setLngLat(marker.geometry.coordinates)
    .setPopup(
      new mapboxgl.Popup().setHTML(`
          <p class="popup-title">${name}<span class="float-right font-weight-normal ml-5"><i>${distance.toFixed(
        2
      )}mi</i></span></p>
          <p class="popup-address">${street}</p>
          <p class="popup-address">${city}, ${state}</p>
          <div class="popup-address">
            ${
              details
                ? details.opening_hours
                  ? `<span class="mb-0 ${
                      details.opening_hours.open_now
                        ? 'text-success'
                        : 'text-danger'
                    }">${
                      details.opening_hours.open_now ? 'Open' : 'Closed'
                    }</span>`
                  : ''
                : ''
            }
            ${accessible ? '<i class="fas fa-wheelchair"></i>' : ''}
            ${unisex ? '<i class="fas fa-genderless"></i>' : ''}
            ${changing_table ? '<i class="fas fa-baby"></i>' : ''}
          </div>
          <div class="d-flex justify-content-between">
            <a href="#" class="text-small" data-toggle="modal" data-target="#restrooms-modal" data-restroom-id="${id}">More</a>
            <a href="http://www.google.com/maps/place/${latitude},${longitude}" target="blank" class="text-small" data-restroom-id="${id}">Directions</a>
          </div>  
          `)
    )
    .addTo(MAP);
  CURRENT_MARKERS.push(newMarker);
};

const clearMapMarkers = () => {
  if (CURRENT_MARKERS) {
    for (let i = CURRENT_MARKERS.length - 1; i >= 0; i--) {
      CURRENT_MARKERS[i].remove();
    }
  }
};

// Fixes the map orientation when the map shifts to show the list results to the left of map on larger devices
const adjustMapForDeviceSize = (lat, lon) => {
  // recenter the map to account for shift on larger devices
  if ($(window).width() > LG_SCREEN_BRKPT) {
    // if no col-md-8 class exists, this is the inital shift, so adjust lon to accout for map shift to right
    const flyToLon = $mapContainer.hasClass('col-md-8')
      ? lon // shift already happened, don't adjust
      : lon + 0.05; // initial shift

    MAP.flyTo({
      center: [flyToLon, lat],
      essential: true, // this animation is considered essential with respect to prefers-reduced-motion
    });
  }
};

const addRestroomLiToDOM = (restroom) => {
  const {
    list_number,
    id,
    name,
    street,
    city,
    state,
    distance,
    details,
    accessible,
    unisex,
    changing_table,
    latitude,
    longitude,
  } = restroom;

  let li = $(`
  <li class="list-group-item">
    <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1">${list_number}. ${name}</h5>
        <small class="ml-1">${distance.toFixed(2)}mi</small>
    </div>
    <p class="mb-0">${street}</p>
    <p class="mb-0">${city}, ${state}</p>
    <div class="row">
      <div class="col col-5 col-md-12 col-xl-5 mt-1">
        ${
          details
            ? details.opening_hours
              ? `<small class="mb-0 ${
                  details.opening_hours.open_now
                    ? 'text-success'
                    : 'text-danger'
                }">${
                  details.opening_hours.open_now ? 'Open' : 'Closed'
                }</small>`
              : ''
            : ''
        }
        ${accessible ? '<i class="fas fa-wheelchair"></i>' : ''}
        ${unisex ? '<i class="fas fa-genderless"></i>' : ''}
        ${changing_table ? '<i class="fas fa-baby"></i>' : ''}
      </div>
      <div class="col mt-1">
        <div class="float-right float-md-left float-xl-right mt-1">
          <a href="#" class="btn btn-sm btn-primary text-small" data-toggle="modal" data-target="#restrooms-modal" data-restroom-id="${id}">More</a>
          <a href="http://www.google.com/maps/place/${latitude},${longitude}" target="blank" class="btn btn-sm btn-info text-small ml-1" data-restroom-id="${id}">Directions</a>
        </div>
      </div>
    </div>
  </li>
`);
  $searchResults.append(li);
};

const setCurrentLocation = async () => {
  // Initialize default coordinates (White House)
  CURRENT_LAT = 38.897957;
  CURRENT_LON = -77.03656;
  HAS_LOCATION = false;

  if (!navigator.geolocation) {
    console.log('Geolocation is not supported by your browser');
    await initializeMap(CURRENT_LAT, CURRENT_LON);
  } else {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        CURRENT_LAT = pos.coords.latitude;
        CURRENT_LON = pos.coords.longitude;
        HAS_LOCATION = true;
        await initializeMap(CURRENT_LAT, CURRENT_LON);
        fillDefaultSearch();
      },
      async () => {
        await initializeMap(CURRENT_LAT, CURRENT_LON);
        fillDefaultSearch();
      }
    );
  }
};

const initializeMap = async (lat, lon) => {
  $geocoderDiv.empty();

  MAP = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    zoom: 11,
    center: [lon, lat],
  });

  let nav = new mapboxgl.NavigationControl();
  MAP.addControl(nav, 'top-right');

  GEOCODER = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    zoom: 11,
  });

  document.getElementById('geocoder').appendChild(GEOCODER.onAdd(MAP));

  if (HAS_LOCATION) {
    // get reverse gecode search string to input into search box
    const resp = await axios.post('/api/reverse-geocode', { lat, lon });
    const location_search_string = resp.data.result;
    GEOCODER.query(location_search_string);
  }

  var layerList = document.getElementById('menu');
  var inputs = layerList.getElementsByTagName('input');

  function switchLayer(layer) {
    var layerId = layer.target.id;
    MAP.setStyle('mapbox://styles/mapbox/' + layerId);
  }

  for (var i = 0; i < inputs.length; i++) {
    inputs[i].onclick = switchLayer;
  }
};

const refreshMap = (lat, lon) => {
  if (GEOCODER.mapMarker) {
    GEOCODER.mapMarker.remove();
  }
  $geocoderDiv.empty();

  MAP.center = [lon, lat];

  GEOCODER = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    zoom: 11,
  });

  document.getElementById('geocoder').appendChild(GEOCODER.onAdd(MAP));

  adjustMapForDeviceSize(lat, lon);
};

// populates the modal that has the detail for restroom listing
const showRestroomModal = (restroom) => {
  $('#restrooms-modal .modal-title').empty();
  $('#restrooms-modal .modal-body').empty();

  const {
    name,
    street,
    city,
    state,
    directions,
    comment,
    details,
    accessible,
    unisex,
    changing_table,
  } = restroom;

  const $name = $(`<h5>${name}</h5>`);
  const $address = $(`
            <div>
              <p class='mb-0'>${street}</p>
              <p class='mb-0'>${city}, ${state}</p>
            </div>`);
  const $topInfo = $(`
            <div class="mb-2"></div>`);
  const $directions = $(`<p class='mb-0'>
                          <small><b>Restroom Directions:</b></small> 
                          <small class="text-muted">${directions}</small>
                        </p>`);
  const $comment = $(`<p class='mb-0'>
                          <small><b>Comment:</b></small>  
                          <small class="text-muted">${comment}</small>
                        </p>`);

  const $descriptors = $(`
    <div class="mb-0">
      ${
        accessible
          ? '<small class="mr-1"><i class="fas fa-wheelchair"></i> Accessible</small>'
          : ''
      }
      ${
        unisex
          ? '<small class="mr-1"><i class="fas fa-genderless"></i> Unisex</small>'
          : ''
      }
      ${
        changing_table
          ? '<small><i class="fas fa-baby"></i> Changing Table</small>'
          : ''
      }
    </div>
  `);

  let $phone;
  let $openNow;
  let $hours;
  let $businessStatus;
  if (details) {
    const { formatted_phone_number, business_status, opening_hours } = details;

    $phone =
      formatted_phone_number &&
      $(`<p class="mb-0">
            <small><b>Phone:</b></small> 
            <small>${formatted_phone_number}</small>
          </p>`);
    $businessStatus =
      business_status &&
      $(`<p class="mb-0">
            <small><b>Business Status:</b></small> 
            <small class="text-muted">${business_status}</small>
          </p>`);
    if (opening_hours) {
      $openNow = `<small class="mb-0 mr-1 ${
        opening_hours.open_now ? 'text-success' : 'text-danger'
      }">${opening_hours.open_now ? 'Open' : 'Closed'}</small>`;

      $hours =
        opening_hours.weekday_text &&
        $(`<div class="mb-2">
            <small class="mb-0"><b><u>Hours:</u></b></small>
            <ul class="hours-list">
              ${opening_hours.weekday_text
                .map((day) => `<li class="mb-0"><small>${day}</small></li>`)
                .join('')}
            </ul>
          </div>`);
    }
  }

  $('#restrooms-modal .modal-title').append($name);
  $('#restrooms-modal .modal-title').append($address);

  $openNow && $descriptors.prepend($openNow);
  $topInfo.append($descriptors);
  $phone && $topInfo.append($phone);
  $('#restrooms-modal .modal-body').append($topInfo);
  $hours && $('#restrooms-modal .modal-body').append($hours);
  $businessStatus && $('#restrooms-modal .modal-body').append($businessStatus);
  $('#restrooms-modal .modal-body').append($directions);
  $('#restrooms-modal .modal-body').append($comment);
};

const hideSidebarOnSmallerDevices = () => {
  if ($(window).width() < LG_SCREEN_BRKPT) {
    $sidebar.toggleClass('toggled');
  }
};

// populates the modal with the saved search info to update
const showEditSavedSearchModal = (savedSearch) => {
  const {
    id,
    name,
    is_default,
    accessible,
    unisex,
    changing_table,
    use_current_location,
    location_search_string,
  } = savedSearch;

  $('#edit-saved-search-modal .modal-title').children('i').empty();
  $('#edit-saved-search-modal').attr('data-search-id', `${id}`);

  const $location = $(
    `<i>${
      use_current_location ? 'Current Location' : location_search_string
    }</i>`
  );

  $editSearchName.val(name);
  $('#edit-saved-search-modal .modal-title').append($location);

  $editDefaultSearch.prop('checked', is_default);
  $editAccessible.prop('checked', accessible);
  $editUnisex.prop('checked', unisex);
  $editChangingTable.prop('checked', changing_table);
};

// Initialize values
const initialize = () => {
  setCurrentLocation();
  hideSidebarOnSmallerDevices();
};

$(initialize());
