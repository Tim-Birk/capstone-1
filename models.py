"""Models for Restroom Finder app."""

from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()

bcrypt = Bcrypt()

class User(db.Model):
    """User."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(254), nullable=False, unique=True)
    password = db.Column(db.Text, nullable=False)
    firstname = db.Column(db.String(50), nullable=True)
    lastname = db.Column(db.String(50), nullable=True)

    searches = db.relationship('SavedSearch', backref='user', cascade="all, delete", passive_deletes=True)

    def __repr__(self):
        """Show info about user."""

        u = self
        return f"<User - id: {u.id}, email: {u.email},  name: {u.lastname}, {u.firstname}>"

    @classmethod
    def register(cls, email, password, firstname, lastname):
        """Register user w/hashed password & return user."""

        hashed_pwd = bcrypt.generate_password_hash(password).decode("utf8")
        user = User(
            email=email,
            password=hashed_pwd,
            firstname=firstname,
            lastname=lastname
        )

        db.session.add(user)
        return user

        # return instance of user w/username and hashed pwd
        return cls(email=email, password=hashed_utf8)

    @classmethod
    def authenticate(cls, email, password):
        """Validate that user exists & password is correct.

        Return user if valid; else return False.
        """

        user = User.query.filter_by(email=email).first()

        if user and bcrypt.check_password_hash(user.password, password):
            # return user instance
            return user
        else:
            return False

class SavedSearch(db.Model):
    """Saved Search."""

    __tablename__ = "saved_searches"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer,db.ForeignKey('users.id', ondelete='cascade'))
    name = db.Column(db.String(50), nullable=False)
    use_current_location = db.Column(db.Boolean, nullable=False, default=True)
    location_search_string = db.Column(db.Text, nullable=True) #if null indicates use current location first
    lon = db.Column(db.Float, nullable=True) #if null indicates use current location first
    lat = db.Column(db.Float, nullable=True) #if null indicates use current location first
    is_default = db.Column(db.Boolean, nullable=False, default=False)
    accessible = db.Column(db.Boolean, nullable=False, default=False)
    unisex = db.Column(db.Boolean, nullable=False, default=False)
    changing_table = db.Column(db.Boolean, nullable=False, default=False)     

    def __repr__(self):
        """Show info about the saved search."""

        s = self
        return f"<SavedSearch - id: {s.id}, user_id: {s.user.id},  name: {s.name}>"

    def serialize(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'use_current_location': self.use_current_location,
            'location_search_string': self.location_search_string,
            'lon': self.lon,
            'lat': self.lat,
            'is_default': self.is_default,
            'accessible': self.accessible,
            'unisex': self.unisex,
            'changing_table': self.changing_table
        } 
    
    @classmethod
    def get_default(cls, user_id):
        """Get default saved search for user in database"""
        return cls.query.filter_by(is_default=True, user_id=user_id).first()

def connect_db(app):
    """Connect to database."""

    db.app = app
    db.init_app(app)
