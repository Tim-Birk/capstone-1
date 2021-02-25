"""SavedSearch model tests."""

# run these tests like:
#
#    python -m unittest test_savedsearch_model.py

from unittest import TestCase
from sqlalchemy.exc import IntegrityError  

from models import db, User, SavedSearch

from app import app

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///restroom-finder-test'

db.create_all()


class SavedSearchModelTestCase(TestCase):
    """Test model for saved searches."""

    def setUp(self):
        """Create test client, add sample data."""

        User.query.delete()
        SavedSearch.query.delete()

        # create test user
        u = User(
            email="test1@test.com",
            password="HASHED_PASSWORD",
            firstname="Joe",
            lastname="Smith"
        )

        db.session.add(u)
        db.session.commit()

        self.test_user1 = u
        self.test_lon = -77.03656
        self.test_lat = 38.897957

        # Create a default search for test user
        s = SavedSearch(
            user_id = self.test_user1.id,
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
      
        self.client = app.test_client()

    def test_savedsearch_model(self):
        """Does create basic model work?"""

        s = SavedSearch(
            user_id = self.test_user1.id,
            name = 'Test Saved Search 2',
            use_current_location = False,
            location_search_string = 'The White House, 1600 Pennsylvania Ave NW, Washington, District of Columbia 20006, United States',
            lon = self.test_lon,
            lat = self.test_lat,
            is_default = False,
            accessible = False,
            unisex = True,
            changing_table = False
        )

        db.session.add(s)
        db.session.commit()

        # Save search should have a user assigned
        self.assertEqual(s.user.id, self.test_user1.id)
        # Test other properties added accurately
        self.assertIsInstance(s.id, int)
        self.assertEqual(s.user_id, self.test_user1.id)
        self.assertEqual(s.name, 'Test Saved Search 2')
        self.assertEqual(s.use_current_location, False)
        self.assertEqual(s.location_search_string, 'The White House, 1600 Pennsylvania Ave NW, Washington, District of Columbia 20006, United States')
        self.assertEqual(s.lon, self.test_lon)
        self.assertEqual(s.lat, self.test_lat)
        self.assertEqual(s.is_default, False)
        self.assertEqual(s.accessible, False)
        self.assertEqual(s.unisex, True)
        self.assertEqual(s.changing_table, False)


    def test_repr_method(self):
        """Does the repr method work as expected?"""
        self.assertEqual(self.test_search1.__repr__(), f"<SavedSearch - id: {self.test_search1.id}, user_id: {self.test_search1.user.id},  name: {self.test_search1.name}>")

    def test_serialize_method(self):
        """Does the serialize method work as expected?"""
        self.assertEqual(self.test_search1.serialize(), {'id': self.test_search1.id,
                                                        'user_id': self.test_search1.user_id,
                                                        'name': self.test_search1.name,
                                                        'use_current_location': self.test_search1.use_current_location,
                                                        'location_search_string': self.test_search1.location_search_string,
                                                        'lon': self.test_search1.lon,
                                                        'lat': self.test_search1.lat,
                                                        'is_default': self.test_search1.is_default,
                                                        'accessible': self.test_search1.accessible,
                                                        'unisex': self.test_search1.unisex,
                                                        'changing_table': self.test_search1.changing_table})

    def test_get_default_method(self):
        """Does the get_default method work as expected?"""
        # The test search should be retured for this user_ir because is_default boolean is True for it
        self.assertEqual(self.test_search1.get_default(self.test_user1.id), self.test_search1)

    
            
         
        



       