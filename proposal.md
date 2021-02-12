# Restroom Finder for Transgender/Intersex/Gender Nonconforming Individuals

## Overview:
The goal of this app is to provide safe restroom access for transgender, intersex and gender nonconforming individuals with accurate and up to date data.  Users can search for restrooms that are closest to their current location and can view additional details to determine their best option.

The user demographic will include:
 - a wide range of ages
 - located all over the world
 - both technical and non-technical backgrounds
 - potentially being in a rush to use the bathroom! 

## Data Sources:
The main source of the data will be provided by the [Refuge Restrooms Public API](https://www.refugerestrooms.org/api/docs/).  This API provides the actual restroom listings upon providing latitude and longitude parameters.  In addition to location, the API also provides other details such as handicap accessibility, changing table availability, unisex designation and user feedback.  To further improve upon the user experience, the [Google Places API](https://developers.google.com/places/web-service/details) will be used to supplement key data that is not provided by the Refuge Restrooms Public API such as hours of operation, phone number, business status, etc..  The [Geopy python library](https://pypi.org/project/geopy/) will also be needed to convert location input into latitude and longitude to provide to the Refuge Restrooms Public API for bathroom listings.

## Database Schema:
```python
    class User(db.Model):
        “””User.”””

        __tablename__ = “users”

        id = db.Column(db.Integer, primary_key=True, autoincrement=True)
        email = db.Column(db.String(254), nullable=False, unique=True)
        password = db.Column(db.Text, nullable=False)
        firstname = db.Column(db.String(50), nullable=True)
        lastname = db.Column(db.String(50), nullable=True)

        searches = db.relationship('Search', backref='user', cascade="all, delete", passive_deletes=True)

    class Search(db.Model):
        “””Search.”””

        __tablename__ = “searches”

        id = db.Column(db.Integer, primary_key=True, autoincrement=True)
        user_id = db.Column(db.Integer,db.ForeignKey('users.id', ondelete='cascade'))
        name = db.Column(db.String(50), nullable=False)
        use_current_location = db.Column(db.Boolean, nullable=False default=True)
        search_string = db.Column(db.Text, nullable=False) #if null indicates use current location first
        lon = db.Column(db.Float, nullable=True) #if null indicates use current location first
        lat = db.Column(db.Float, nullable=True) #if null indicates use current location first
        is_default = db.Column(db.Boolean, nullable=False default=False)
        accessible = db.Column(db.Boolean, nullable=False default=False)
        unisex = db.Column(db.Boolean, nullable=False default=False)
        changing_table = db.Column(db.Boolean, nullable=False default=False)        
```

## Potential API Issues:
 - One challenge is going to be mapping the restrooms found in the Refuge Restrooms API to the place of business or public location in the Google Places API.  Logic will need to be created to handle cases when multiple results are returned from Google Places as well as when no results are returned.
 - The Google Places API could could become pricey if the the monthly call volume goes beyond the free credit range (about 10,000 calls per month).
 - The Mapbox free tier is fairly generous at 50,000 map loads a month, then will start charging thereafter.

## Sensitive Information:
 - Encrypted passwords will be stored for the user model.
 - The privacy of user identities will need to be put into consideration as well.  First and last name will be optional fields.  At a minimum, an email address needs to be provided to identify a single user.

## Functionality:
 - Users will have their own profile set up that includes basic information that they can edit as well as an option to delete the account.
 - Users can add, edit and delete saved searches (location and filters used) to use at a later time
 - Users will login and either use their current location or provide a location for the app to search for restroom listings.
 - User location and restroom locations will be displayed on a map, via [Mapbox](https://www.mapbox.com/).
 - Restroom locations will be listed underneath the map.
 - Users can drill into each location to see the detail page for that location.
 - Ideally, users could select a location and begin Navigation.  TBD if that can be done within the app using Mapbox or if the user would have their location and destination automatically opened in Google Maps to use that navigation.

## User Flow:
 1. Landing/welcome page with very basic information where the user can navigate to a create account or login page.
 2. After logging in, the user is brought to the “Search” page.  Their current location will be selected by default, however, there will also be an input box that they can use to enter any combination of address, city, state or zip code to get the geolocation for the Refuge api.  There will also be other optional filters they can search (changing table, handicap, unisex).  Additionally, the user can select a saved search they created by selecting it from a dropdown.  Selecting the saved search will populate the rest of the search form with the parameters from that search. If the user has a default saved search, the search form will be populated with that information when the search page initializes.  If no default search exists, it would be ideal to have the map underneath the search input populated with the user’s current location.
 3. When filling out the search form, there will also be a "Save Search" checkbox available.  If the user checks that box, they will be presented with a modal to provide a "Search Name" before the search actually runs.  Once they name the search (ie. "Baby Friendly - Long Beach") and click Save, the saved search will be added to the database with the rest of the search parameters that they used.
 4. After the search runs, the map will be populated with the results of the Refuge Restrooms API response.  The map results will be numbered and correspond to the numbered list of restrooms below the map.
 5. The user can drill into each restroom listing to see more detail, including the additional details that were provided by the Google Places API.
 6. The user can select a restroom and begin navigation (TBD exactly how).
 7. There will be an additional flow for accessing saved searches in a "User Settings" where the user can add, update and delete saved searches.

## Beyond CRUD:
The CRUD aspect of the app revolves around the User and Search models for what type of restroom results they want returned.  The entire rest of the app is dedicated to providing an efficient and accurate search for safe restrooms to access.  The main stretch goal at the moment is to have navigation within the application itself using the Mapbox map so that the user doesn’t have to leave the application during the entire experience.

