"""SavedSearch View tests."""

# run these tests like:
#
#    FLASK_ENV=production python -m unittest test_savedsearch_views.py

from unittest import TestCase

from models import db, User, SavedSearch

from app import app, CURR_USER_KEY

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///restroom-finder-test'

db.create_all()

app.config['WTF_CSRF_ENABLED'] = False


class SavedSearchViewTestCase(TestCase):
    """Test views for savedsearch."""

    def setUp(self):
        """Create test client, add sample data."""

        SavedSearch.query.delete()
        User.query.delete()
        
        self.client = app.test_client()

        self.testuser = User.register(
            email="test@test.com",
            password="test_password",
            firstname="Tom",
            lastname="Jones"
        )                            

        db.session.commit()

        self.test_lon = -77.03656
        self.test_lat = 38.897957

        # Create a default search for test user
        s = SavedSearch(
            user_id = self.testuser.id,
            name = "Test Saved Search 1",
            use_current_location = True,
            location_search_string = None,
            lon = self.test_lon,
            lat = self.test_lat,
            is_default = True,
            accessible = True,
            unisex = False,
            changing_table = True
        )

        db.session.add(s)
        db.session.commit()

        self.test_search1 = s
        self.test_search_id = s.id
      
    def test_add_savedsearch_loggedout(self):
        """Can user add a saved search if they're logged out?"""

        data = {
            'user_id': self.testuser.id,
            'name': 'Test Search',
            'use_current_location': False,
            'location_search_string': 'The White House, 1600 Pennsylvania Ave NW, Washington, District of Columbia 20006, United States',
            'lon': self.test_lon,
            'lat': self.test_lat,
            'is_default': False,
            'accessible': True,
            'unisex': True,
            'changing_table': True
        }
        with self.client as c:
            resp = c.post("/search/add", data=data, follow_redirects=True)
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn(f'<p class="flash error">You must be logged in to do that.</p>', html)

    def test_add_savedsearch_loggedin(self):
        """Can use add a saved search when logged in?"""
        with self.client as c:
            with c.session_transaction() as sess:
                sess[CURR_USER_KEY] = self.testuser.id

            data = {
                'name': 'New Test Search',
                'use_current_location': False,
                'location_search_string': 'The White House, 1600 Pennsylvania Ave NW, Washington, District of Columbia 20006, United States',
                'lon': self.test_lon,
                'lat': self.test_lat,
                'is_default': True,
                'accessible': True,
                'unisex': True,
                'changing_table': True
            }
           
            resp = c.post("/search/add", json=data, follow_redirects=True)
            html = resp.get_data(as_text=True)

            # Make sure it correct json resp status code
            self.assertEqual(resp.status_code, 201)

            s = SavedSearch.query.filter_by(name="New Test Search").first()
            self.assertEqual(s.user_id, self.testuser.id)
            self.assertEqual(s.name, "New Test Search")
            self.assertEqual(s.use_current_location, False)
            self.assertEqual(s.location_search_string, 'The White House, 1600 Pennsylvania Ave NW, Washington, District of Columbia 20006, United States')
            self.assertEqual(s.lon, self.test_lon)
            self.assertEqual(s.lat, self.test_lat)
            self.assertEqual(s.is_default, True)
            self.assertEqual(s.accessible, True)
            self.assertEqual(s.unisex, True)
            self.assertEqual(s.changing_table, True)

            # Make sure adding a new default sets is_default = false on original saved search that was set as default
            original_default_search = db.session.query(SavedSearch).get(self.test_search_id)
            self.assertEqual(original_default_search.is_default, False)

    def test_get_single_savedsearch(self):
        """Does getting a single saved search return the right response"""
        with self.client as c:
            with c.session_transaction() as sess:
                sess[CURR_USER_KEY] = self.testuser.id

            resp = c.get(f"/search/{self.test_search_id}")

            # Make sure it correct json resp status code
            self.assertEqual(resp.status_code, 201)

    def test_update_saved_search(self):
        """Can user update their saved search?"""
        with self.client as c:
            with c.session_transaction() as sess:
                sess[CURR_USER_KEY] = self.testuser.id

            name = 'Updated Name'
            use_current_location = True
            location_search_string = None
            is_default = True
            accessible = False
            unisex = False
            changing_table = False

            data = {
                'name': name,
                'is_default': is_default,
                'accessible': accessible,
                'unisex': unisex,
                'changing_table': changing_table
            }

            # update test saved search using the update route
            resp = c.post(f"/search/{self.test_search_id}", json=data)
            
            # Make sure it correct json resp status code
            self.assertEqual(resp.status_code, 201)

            # Make sure appropriate fields updated (Location is not updated once set initially)
            s = SavedSearch.query.get(self.test_search_id)
            self.assertEqual(s.user_id, self.testuser.id)
            self.assertEqual(s.name, name)
            self.assertEqual(s.is_default, is_default)
            self.assertEqual(s.accessible, accessible)
            self.assertEqual(s.unisex, unisex)
            self.assertEqual(s.changing_table, changing_table)

    def test_delete_saved_search_logged_in(self):
        """Can use delete a saved search when logged in?"""
        with self.client as c:
            with c.session_transaction() as sess:
                sess[CURR_USER_KEY] = self.testuser.id

            # update test user using the update route
            resp = c.delete(f"/search/{self.test_search_id}")
            html = resp.get_data(as_text=True)

            # check response and redirect to correct html for user profile with updated info
            self.assertEqual(resp.status_code, 200)
            self.assertIn('{"message":"Saved search deleted"}', html)

    def test_delete_search_logged_out(self):
        """Can user delete a message if they're logged out?"""
        with self.client as c:
            resp = c.delete(f"/search/{self.test_search_id}", follow_redirects=True)
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn(f'<p class="flash error">You must be logged in to do that.</p>', html)
