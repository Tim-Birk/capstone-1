"""User model tests."""

# run these tests like:
#
#    python -m unittest test_user_model.py

from unittest import TestCase
from sqlalchemy.exc import IntegrityError  

from models import db, User, SavedSearch

from app import app

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///restroom-finder-test'

db.create_all()


class UserModelTestCase(TestCase):
    """Test model for users."""

    def setUp(self):
        """Create test client, add sample data."""

        User.query.delete()
        SavedSearch.query.delete()

        # create test user to test the various methods and unique restraints
        u1 = User(
            email="test1@test.com",
            password="HASHED_PASSWORD",
            firstname="Joe",
            lastname="Smith"
        )

        db.session.add(u1)
        db.session.commit()

        self.test_user1 = u1
        self.client = app.test_client()

    def test_user_model(self):
        """Does create basic model work?"""

        u = User(
            email="testuser@test.com",
            password="HASHED_PASSWORD",
            firstname="Tim",
            lastname="Tester"
        )

        db.session.add(u)
        db.session.commit()

        # User should have no searches
        self.assertEqual(len(u.searches), 0)

    def test_repr_method(self):
        """Does the repr method work as expected?"""
        self.assertEqual(self.test_user1.__repr__(), f"<User - id: {self.test_user1.id}, email: {self.test_user1.email},  name: {self.test_user1.lastname}, {self.test_user1.firstname}>")

    def test_register_method_valid(self):
        """Does the register method work as expected given valid input and credentials?"""

        user = User.register(
            email="testuser2@test.com",
            password="HASHED_PASSWORD",
            firstname="Tom",
            lastname="Jones"
        )

        db.session.commit()
        # Does User.register successfully create a new user given valid credentials?
        self.assertIsInstance(user.id, int)
        self.assertEqual(user.email, 'testuser2@test.com')
        self.assertEqual(user.firstname, 'Tom')        
        self.assertEqual(user.lastname, 'Jones')

    def test_register_method_invalid(self):
        """Does the sign_up method work as expected given invalid input/credentials?"""
        cases = [
            {'email': 'test1@test.com', 'password': 'HASHED_PASSWORD', 'firstname': 'Test', 'lastname': 'Person1'}, # duplicate email
            {'email': None, 'password': 'HASHED_PASSWORD', 'firstname': 'Test', 'lastname': 'Person2'} # null email
        ]

        # Does User.create fail to create a new user if any of the validations (e.g. uniqueness, non-nullable fields) fail?    
        for case in cases:
            user = User.register(
                email=case['email'],
                password=case['password'],
                firstname=case['firstname'],
                lastname=case['lastname']
            )
            
            failed = False
            try:
                db.session.commit()
            except IntegrityError as ie:
                failed = True
                self.assertIsInstance(ie, IntegrityError)
                db.session.rollback()
            
            self.assertEqual(failed, True)
                           
    def test_authenticate_valid(self):
        """Does the User.authenticate method work as expected given valid username and password?"""

        user = User.register(
            email='newuser@somedomain.com',
            password='password123',
            firstname='Test',
            lastname='User'
        )

        db.session.commit()

        good_user = User.authenticate(email='newuser@somedomain.com', password="password123")
        # Does User.authenticate successfully return a user when given a valid email and password?
        self.assertIsInstance(good_user.id, int)
        self.assertEqual(good_user.email, 'newuser@somedomain.com')
        self.assertEqual(good_user.firstname, 'Test')
        self.assertEqual(good_user.lastname, 'User')

        # Does User.authenticate fail to return a user when the email is invalid?
        bad_user = User.authenticate(email='wrongemail@somedomain.com', password="password123")
        self.assertEqual(bad_user, False)
        # Does User.authenticate fail to return a user when the password is invalid? 
        bad_user = User.authenticate(email='newuser@somedomain.com', password="wrongPassword")
        self.assertEqual(bad_user, False)
            
         
        



       