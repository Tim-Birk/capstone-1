const LG_SCREEN_BRKPT = 750;
const NUM_RESULTS = 4;
let CURRENT_LAT;
let CURRENT_LON;
let GEOCODER;
let MAP;
let CURRENT_MARKERS = [];
let RESTROOM_RESULTS = new Map();

const $restroomContainer = $('#restroom-container');
const $mobileSpinnerContainer = $('#mobile-spinner-container');
const $spinnerContainer = $('#spinner-container');
const $useCurrentLocation = $('#use-current-location');
const $filterAccessible = $('#accessible');
const $filterUnisex = $('#unisex');
const $filterChangingTable = $('#changing-table');
const $locationSearchContainer = $('#location-search-container');
const $mapContainer = $('#map-container');
const $resultsContainer = $('#results-container');
const $searchResults = $('#search-results');
const $geocoderDiv = $('#geocoder');

$useCurrentLocation.on('click', (evt) => {
  initializeMap();

  if ($(evt.target)[0].checked) {
    $locationSearchContainer.addClass('collapse');
  } else {
    $locationSearchContainer.removeClass('collapse');
  }
});

$('#search-form').on('submit', async (evt) => {
  evt.preventDefault();
  // clear previous search results
  $searchResults.empty();

  showLoadingSpinner();

  // Clear existing results in global list
  RESTROOM_RESULTS.clear();

  // Clear existing markers from map
  clearMapMarkers();

  const coordinates = getCoordinates();

  // move map over to display search results next to it on larger devices
  $mapContainer.addClass('col-md-8');

  // recenter the map to account for shift on larger devices
  if ($(window).width() > LG_SCREEN_BRKPT) {
    MAP.flyTo({
      center: [coordinates.lon + 0.05, coordinates.lat],
      essential: true, // this animation is considered essential with respect to prefers-reduced-motion
    });
  }
  await getRestrooms(coordinates.lat, coordinates.lon);

  hideLoadingSpinner();

  handleNoResults();
});

$('#search-container').on('click', 'a', async function handleSearch(evt) {
  const id = $(evt.target).attr('data-restroom-id');
  if (!id) return;

  const restroom = RESTROOM_RESULTS.get(Number(id));
  showRestroomModal(restroom);
});

const showLoadingSpinner = () => {
  // remove existing spinner (if restart)
  $mobileSpinnerContainer.children().remove();
  $spinnerContainer.children().remove();
  $searchResults.hide();

  // create a spinner
  const $spinner = $(`
          <div id="spinner" class="d-flex justify-content-center mt-5">
              <div class="spinner-border text-primary" style="width: 5rem; height: 5rem;" role="status">
              <span class="sr-only">Loading...</span>
              </div>
          </div>`);

  // for smaller devices display spinner at the above the map
  if ($(window).width() < LG_SCREEN_BRKPT) {
    $mobileSpinnerContainer.append($spinner);
  } else {
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
  if (!$useCurrentLocation.is(':checked') && GEOCODER.lastSelected) {
    let result = JSON.parse(GEOCODER.lastSelected);
    const { coordinates } = result.geometry;
    coords.lat = coordinates[1];
    coords.lon = coordinates[0];
  }

  return coords;
};

const getRestrooms = async (lat, lon) => {
  // get extra results from api in case user requests changing table filter
  const extraResults = 10;
  const per_page = NUM_RESULTS + extraResults;

  // get restroom listings from Refuge API
  return axios
    .get(
      `https:\\www.refugerestrooms.org/api/v1/restrooms/by_location?lat=${lat}&lng=${lon}&ada=${$filterAccessible.is(
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

        // get place_id from top candidate to feed to details endpoint
        const uri = encodeURI(
          `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${restroom.name}&inputtype=textquery&fields=place_id&locationbias=circle:2000@${restroom.latitude},${restroom.longitude}&key=${GOOGLE_API_KEY}`
        );
        const placeResp = await axios.get(uri);
        const place_id = placeResp.data.candidates[0].place_id;

        // use place_id to get detail data from details endpoint
        const detailUri = encodeURI(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=name,opening_hours,formatted_phone_number,business_status&key=${GOOGLE_API_KEY}`
        );
        const detailResp = await axios.get(detailUri);

        const details = detailResp.data.result;
        restroom.details = { ...details };
        restroom.list_number = RESTROOM_RESULTS.size + 1;

        RESTROOM_RESULTS.set(restroom.id, restroom);

        // add restroom marker to map
        addMarkerToMap(restroom);

        // add to search results list
        addRestroomLiToDOM(restroom);

        // check if requested number of results has been met
        if (RESTROOM_RESULTS.size === NUM_RESULTS) {
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
          <p class="popup-title">${name}</p>
          <p class="popup-address">${street}</p>
          <p class="popup-address">${city}, ${state}</p>
          <p class="popup-address">${distance.toFixed(2)}mi</p>
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
          <a href="#" class="text-small float-right" data-toggle="modal" data-target="#restrooms-modal" data-restroom-id="${id}">more info</a>
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
  } = restroom;

  let li = $(`
  <li class="list-group-item">
    <div class="d-flex w-100 justify-content-between">
        <h5 class="mb-1">${list_number}. ${name}</h5>
        <small class="ml-1">${distance.toFixed(2)}mi</small>
    </div>
    <p class="mb-0">${street}</p>
    <p class="mb-0">${city}, ${state}</p>
    ${
      details
        ? details.opening_hours
          ? `<small class="mb-0 ${
              details.opening_hours.open_now ? 'text-success' : 'text-danger'
            }">${details.opening_hours.open_now ? 'Open' : 'Closed'}</small>`
          : ''
        : ''
    }
    ${accessible ? '<i class="fas fa-wheelchair"></i>' : ''}
    ${unisex ? '<i class="fas fa-genderless"></i>' : ''}
    ${changing_table ? '<i class="fas fa-baby"></i>' : ''}
    <a href="#" class="text-small float-right" data-toggle="modal" data-target="#restrooms-modal" data-restroom-id="${id}">more info</a>
  </li>
`);
  $searchResults.append(li);
};

const setCurrentLocation = () => {
  // Initialize default coordinates (White House)
  CURRENT_LAT = 38.897957;
  CURRENT_LON = -77.03656;

  if (!navigator.geolocation) {
    console.log('Geolocation is not supported by your browser');
    initializeMap();
  } else {
    navigator.geolocation.getCurrentPosition((pos) => {
      CURRENT_LAT = pos.coords.latitude;
      CURRENT_LON = pos.coords.longitude;
      initializeMap();
    });
  }
};

const initializeMap = () => {
  $geocoderDiv.empty();

  MAP = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v11',
    zoom: 11,
    center: [CURRENT_LON, CURRENT_LAT],
  });

  let nav = new mapboxgl.NavigationControl();
  MAP.addControl(nav, 'top-right');

  GEOCODER = new MapboxGeocoder({
    accessToken: mapboxgl.accessToken,
    mapboxgl: mapboxgl,
    zoom: 11,
  });

  document.getElementById('geocoder').appendChild(GEOCODER.onAdd(MAP));

  var el = document.createElement('div');
  el.className = 'marker';
  el.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
  el.style.backgroundColor = 'orange';
  el.style.color = '#fff';
  el.style.width = '20px';
  el.style.height = '20px';

  // add marker to map
  new mapboxgl.Marker(el)
    .setLngLat([CURRENT_LON, CURRENT_LAT])
    .setPopup(
      new mapboxgl.Popup().setHTML(
        `<p class="popup-title">Current Location</p>`
      )
    )
    .addTo(MAP);

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

const showRestroomModal = (restroom) => {
  $('.modal-title').empty();
  $('.modal-body').empty();

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

  $('.modal-title').append($name);
  $('.modal-title').append($address);

  $openNow && $descriptors.prepend($openNow);
  $topInfo.append($descriptors);
  $phone && $topInfo.append($phone);
  $('.modal-body').append($topInfo);
  $hours && $('.modal-body').append($hours);
  $businessStatus && $('.modal-body').append($businessStatus);
  $('.modal-body').append($directions);
  $('.modal-body').append($comment);
};

// Initialize values
$(setCurrentLocation());
