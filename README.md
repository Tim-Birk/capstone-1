## Relief Restrooms

[View Application](https://restroom-locator.herokuapp.com/)

An application to provide safe restroom access for transgender, intersex and gender nonconforming individuals with accurate and up to date data.

## Features

- Use your current location or provide a location to search for restroom listings provided by the [Refuge Restrooms Public API](https://www.refugerestrooms.org/api/docs/)
- User location and restroom listings are displayed on a map
- This application improves upon the results returned from the Refuge API by providing additional details for each listing such as phone number, business hours, business status, etc. through the [Google Places API](https://developers.google.com/places/web-service/details)
- Apply search filters such as Accessible, Unisex, etc. to get search results that suit your needs
- Create saved searches (location and search filters) for future use

## User Flows:

1.  Landing/welcome page with very basic information where the user can navigate to a create account or login page.
2.  After logging in, the user is brought to the “Search” page. They can search based on location and apply a variety of filters to search by. Additionally, the user can select a saved search they previously created. Selecting the saved search will populate the rest of the search form with the parameters from the saved search. If the user has a default saved search, the search form will be populated with that information when the search page initializes.
3.  When filling out the search form, there is an option to save the search. If the user checks that box, they will be presented with a modal to provide a "Search Name" before the search actually runs. Once they name the search (ie. "Baby Friendly - Long Beach") and click Save, the saved search will be added to the database with the rest of the search parameters that they used. Users also can update and/or delete and existing saved search after loading it.
4.  After the search runs, the map is populated with the results of the Refuge Restrooms API response. The map results are numbered and correspond to the numbered list of restrooms below the map.
5.  The user can drill into each restroom listing to see more detail, including the additional details that were provided by the Google Places API.
6.  The user can select a restroom and begin navigation in Google Maps below. Future implementations may have a way to have navigation directly within the application.

## Technology Stack

- Backend: Python, Flask, PostgreSQL, SQLAlchemy
- Frontend: JavaScript, AJAX, HTML, CSS, Bootstrap
- Testing: Unit and Integration tests written with Python 'unittest' Framework
