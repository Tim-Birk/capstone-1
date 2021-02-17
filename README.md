## Database Schema:
[diagram](schema.PNG)
```python
    class User(db.Model):
        “””User.”””

        __tablename__ = "users"

        id = db.Column(db.Integer, primary_key=True, autoincrement=True)
        email = db.Column(db.String(254), nullable=False, unique=True)
        password = db.Column(db.Text, nullable=False)
        firstname = db.Column(db.String(50), nullable=True)
        lastname = db.Column(db.String(50), nullable=True)

        searches = db.relationship('SavedSearch', backref='user', cascade="all, delete", passive_deletes=True)

    class Search(db.Model):
        “””Search.”””

        __tablename__ = “searches”

        id = db.Column(db.Integer, primary_key=True, autoincrement=True)
        user_id = db.Column(db.Integer,db.ForeignKey('users.id', ondelete='cascade'))
        name = db.Column(db.String(50), nullable=False)
        use_current_location = db.Column(db.Boolean, nullable=False, default=True)
        location_search_string = db.Column(db.Text, nullable=False) #if null indicates use current location first
        lon = db.Column(db.Float, nullable=True) #if null indicates use current location first
        lat = db.Column(db.Float, nullable=True) #if null indicates use current location first
        is_default = db.Column(db.Boolean, nullable=False, default=False)
        accessible = db.Column(db.Boolean, nullable=False, default=False)
        unisex = db.Column(db.Boolean, nullable=False, default=False)
        changing_table = db.Column(db.Boolean, nullable=False, default=False)         
```