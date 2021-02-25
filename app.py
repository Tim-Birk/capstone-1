from flask import Flask, redirect, render_template, flash, session, g, request, jsonify
from flask_debugtoolbar import DebugToolbarExtension
from models import db, connect_db, User, SavedSearch
from forms import RegisterForm, LoginForm, UserEditForm
from secrets import SECRET_KEY, MAPBOX_ACCESS_TOKEN
from sqlalchemy.exc import IntegrityError

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql:///restroom-finder'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = True

connect_db(app)
db.create_all()

app.config['SECRET_KEY'] = SECRET_KEY
app.config['DEBUG_TB_INTERCEPT_REDIRECTS'] = False

debug = DebugToolbarExtension(app)

CURR_USER_KEY = "curr_user"

@app.before_request
def add_user_to_g():
    """If logged in, add curr user to Flask global."""

    if CURR_USER_KEY in session:
        g.user = User.query.get(session[CURR_USER_KEY])

    else:
        g.user = None


def do_login(user):
    """Log in user."""

    session[CURR_USER_KEY] = user.id

def do_logout():
    """Logout user."""

    if CURR_USER_KEY in session:
        del session[CURR_USER_KEY]

def validate_password(email, password):
    """Validate user's password and return a boolean of the result"""
    user = User.authenticate(email, password)
    if user:
        return True
    
    return False

@app.route("/")
def root():
    """Homepage.  If user is logged in, automatically redirect to search page"""

    if g.user:
        return redirect(f"/search")

    return render_template("/landing.html")

@app.route("/search")
def search_page():
    """Search page."""

    if not g.user:
        flash(f'You must be logged in to view this page.', "error")
        return redirect(f"/login")

    defaultSavedSearch = SavedSearch.get_default(g.user.id)

    return render_template("/search.html", token=MAPBOX_ACCESS_TOKEN, default=defaultSavedSearch)

########################################################################################################
# Saved Search Routes
@app.route("/search/add", methods=["POST"])
def add_search():
    """Add new saved search for user"""
    if not g.user:
        flash(f'You must be logged in to do that.', "error")
        return redirect(f"/login")

    user_id = g.user.id
    name = request.json['name']
    use_current_location = request.json['use_current_location']
    lon = request.json['lon']
    lat = request.json['lat']
    location_search_string  = request.json['location_search_string'] if not request.json['location_search_string'] == "" else None
    is_default = request.json['is_default']
    accessible = request.json['accessible']
    unisex = request.json['unisex']
    changing_table = request.json['changing_table']

    # if there is another existing default saved search, set is_default = false
    if is_default:
        defaultSavedSearch = SavedSearch.get_default(g.user.id)
        if defaultSavedSearch:
            defaultSavedSearch.is_default = False

    saved_search = SavedSearch(
        user_id=user_id,
        name=name, 
        use_current_location=use_current_location, 
        lon=lon, 
        lat=lat,
        location_search_string=location_search_string, 
        is_default=is_default, 
        accessible=accessible, 
        unisex=unisex,
        changing_table=changing_table
    )
    db.session.add(saved_search)
    db.session.commit()
    return (jsonify(saved_search=saved_search.serialize()), 201)

@app.route("/search/<int:id>")
def get_saved_search(id):
    """Get single saved search by id"""

    if not g.user:
        flash(f'You must be logged in to do that.', "error")
        return redirect(f"/login")

    saved_search = SavedSearch.query.get_or_404(id)

    if not g.user.id == saved_search.user_id:
        flash(f'You do not have permisson to do that.', "error")
        return redirect(f"/search")

    return (jsonify(saved_search=saved_search.serialize()), 201)

@app.route("/search/<int:id>", methods=["POST"])
def edit_saved_search(id):
    """Handle saved search edit."""
    if not g.user:
        flash(f'You must be logged in to do that.', "error")
        return redirect(f"/login")

    saved_search = SavedSearch.query.get_or_404(id)

    if not g.user.id == saved_search.user_id:
        flash(f'You do not have permission to do that.', "error")
        return redirect(f"/search")

    saved_search.name = request.json.get('name', saved_search.name)
    saved_search.is_default = request.json.get('is_default', saved_search.is_default)
    saved_search.accessible = request.json.get('accessible', saved_search.accessible)
    saved_search.unisex = request.json.get('unisex', saved_search.unisex)
    saved_search.changing_table = request.json.get('changing_table', saved_search.changing_table)

    # if there is another existing default saved search, set is_default = False
    if saved_search.is_default:
        defaultSavedSearch = SavedSearch.get_default(g.user.id)
        if defaultSavedSearch and not defaultSavedSearch.id == id:
            defaultSavedSearch.is_default = False

    db.session.commit()
    flash(f"Updated saved search: {saved_search.name}","success")
    return (jsonify(saved_search=saved_search.serialize()), 201)

@app.route("/search/<int:id>", methods=["DELETE"])
def delete_saved_search(id):
    """Delete saved search from database"""
    if not g.user:
        flash(f'You must be logged in to do that.', "error")
        return redirect(f"/login")

    saved_search = SavedSearch.query.get_or_404(id)

    if not g.user.id == saved_search.user_id:
        flash(f'You do not have permission to do that.', "error")
        return redirect(f"/search")

    try:
        db.session.delete(saved_search)
        db.session.commit()

        flash("Saved search deleted", "success")
    except Exception as e:
        flash(f"There was an error deleting the saved earch: {e}", "error")
        return (jsonify(message="Error deleting saved search"), 400)

    return (jsonify(message="Saved search deleted"), 200)

########################################################################################################
# User Routes
@app.route("/register", methods=["GET","POST"])
def show_register_form():
    """GET: Show a form that when submitted will register/create a user.
    
    POST: Process the registration form by adding a new user. Then redirect to the search page"""
    
    if g.user:
        return redirect(f"/search")

    form = RegisterForm()

    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data
        firstname = form.firstname.data
        lastname = form.lastname.data
        try:
            new_user = User.register(
                email, 
                password, 
                firstname, 
                lastname
            )
            db.session.commit()
        except IntegrityError as e:
            errorInfo = e.orig.args
            if 'email' in e.orig.args[0]:
                form.email.errors.append(f'{email} is already in use.  Please pick another email.')
            return render_template('register.html', form=form)
        
        do_login(new_user)
        flash(f'Welcome!  Your new account has been created for {new_user.email}', "success")
        return redirect(f'/search')
    else:
        return render_template("register.html", form=form)

@app.route("/login", methods=["GET","POST"])
def login_user():
    """GET: Show a form that when submitted will login a user. 
    
    POST: Authenticates user and adds them to session. Then redirects to their user page"""

    if g.user:
        return redirect(f"/search")

    form = LoginForm()
    if form.validate_on_submit():
        email = form.email.data
        password = form.password.data

        user = User.authenticate(email, password)
        if user:
            flash(f"Welcome Back, {user.email}!", "success")
            do_login(user)
            return redirect(f'/search')
        else:
            form.email.errors = ['Invalid email/password.']

    return render_template('login.html', form=form)

@app.route('/logout')
def logout_user():
    """Log user out by removing them from the session"""
    do_logout()
    flash("You are logged out.", "success")
    return redirect('/login')

@app.route('/users/<int:user_id>', methods=["GET", "POST"])
def update_user(user_id):
    """Update profile for current user."""

    if not g.user or not g.user.id == user_id:
        flash("Access unauthorized.", "error")
        return redirect("/login")

    user = User.query.get_or_404(user_id)
    form = UserEditForm(obj=user)

    if form.validate_on_submit():
        firstname = form.firstname.data
        lastname = form.lastname.data

        user.firstname = firstname
        user.lastname = lastname
        
        db.session.commit()

        flash(f"Updated profile for {user.email}","success")
        return redirect(f"/users/{user_id}")

    else:
        return render_template("/user-edit.html", form=form)



