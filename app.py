from flask import Flask, redirect, render_template, flash, session, g
from flask_debugtoolbar import DebugToolbarExtension
from models import db, connect_db, User, SavedSearch
from forms import RegisterForm, LoginForm
<<<<<<< HEAD
from secrets import SECRET_KEY
=======
from secrets import SECRET_KEY, MAPBOX_ACCESS_TOKEN
>>>>>>> feature/createSearchPage
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

<<<<<<< HEAD
    return render_template("/search.html")
=======
    return render_template("/search.html", token=MAPBOX_ACCESS_TOKEN)
>>>>>>> feature/createSearchPage

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

        new_user = User.register(email, password)
        new_user.email = email
        new_user.firstname = firstname
        new_user.lastname = lastname

        db.session.add(new_user)
        
        try:
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

