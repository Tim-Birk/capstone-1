"""User View tests."""

# run these tests like:
#
#    FLASK_ENV=production python -m unittest test_user_views.py

from unittest import TestCase

from models import db, User, SavedSearch

from app import app, CURR_USER_KEY

app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///restroom-finder-test'

db.create_all()

app.config['WTF_CSRF_ENABLED'] = False


class UserViewTestCase(TestCase):
    """Test views for user."""

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

    def test_home_logged_in_redirect(self):
        """Does the home route display correct the html if the user is logged in?
        
        The user should be redirected to the Search Page
        """
        with self.client as c:
            with c.session_transaction() as sess:
                sess[CURR_USER_KEY] = self.testuser.id

            resp = c.get("/", follow_redirects=True)
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('<div id="search-container" class="col mt-3">', html)

    def test_home_logged_out(self):
        """Does the home route display correct the html if the user is logged in"""

        with self.client as c:
            resp = self.client.get("/")
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('id="landing-container"', html)

    def test_display_register_form(self):
        """Does the register route display correct the html"""

        with self.client as c:

            resp = self.client.get("/register")
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('<form id="register-form" class="user-form" method="POST">', html)

    def test_add_user(self):
        """Can user add a new user and be redirected to the search paged?"""
        with self.client as c:
            u = {"email": "test123@test.com",
                 "password": "testpassword",
                 "firstname": "Jon",
                 "lastname": "Snow"}
            resp = c.post("/register", data=u, follow_redirects=True)
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('<div id="search-container" class="col mt-3">', html)

    def test_login_form(self):
        """Does the add login route display correct the html"""

        with self.client as c:

            resp = self.client.get("/login")
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('<form id="login-form" class="user-form" method="POST">', html)

    def test_login_user(self):
        """Can user login?
        
        The user will be redirected to the search page on successful login
        """
        with self.client as c:
            u = {"email": "test@test.com",
                 "password": "test_password"}
            resp = c.post("/login", data=u, follow_redirects=True)
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('<div id="search-container" class="col mt-3">', html)

    def test_logout(self):
        """Can user logout?"""

        with self.client as c:
            with c.session_transaction() as sess:
                sess[CURR_USER_KEY] = self.testuser.id

            resp = c.get("/logout", follow_redirects=True)
            html = resp.get_data(as_text=True)

            # Does the user get redirected to the login page after logging out?
            self.assertEqual(resp.status_code, 200)
            self.assertIn('<form id="login-form" class="user-form" method="POST">', html)
            
    def test_display_user_profile(self):
        """Does the user profile route display correct the html"""

        with self.client as c:
            with c.session_transaction() as sess:
                sess[CURR_USER_KEY] = self.testuser.id

            resp = self.client.get(f"/users/{self.testuser.id}")
            html = resp.get_data(as_text=True)

            self.assertEqual(resp.status_code, 200)
            self.assertIn('<form id="edit-user-form" class="user-form" method="POST">', html)

    def test_update_user(self):
        """Can user update their profile info?"""
        with self.client as c:
            with c.session_transaction() as sess:
                sess[CURR_USER_KEY] = self.testuser.id

            firstname = "Newfirst"
            lastname = "Newlast"

            u = {"firstname": firstname,
                 "lastname": lastname}

            # update test user using the update route
            resp = c.post(f"/users/{self.testuser.id}", data=u, follow_redirects=True)
            html = resp.get_data(as_text=True)

            # check response and redirect to correct html for user profile with updated info
            self.assertEqual(resp.status_code, 200)
            self.assertIn(f'<input class="form-control" id="firstname" name="firstname" required type="text" value="{firstname}">', html)

            # check testuser's info has been updated correctly
            test_user = User.query.get(self.testuser.id)
            self.assertEqual(test_user.email,"test@test.com")
            self.assertEqual(test_user.firstname, firstname)
            self.assertEqual(test_user.lastname, lastname)


    