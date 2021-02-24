from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, TextAreaField
from wtforms.validators import InputRequired, Email, Length

class RegisterForm(FlaskForm):
    """Form for registering user."""
    email = StringField("Email", validators=[InputRequired(), Email(), Length(max=254)])
    password = PasswordField("Password", validators=[InputRequired()])
    firstname = StringField("First Name", validators=[InputRequired(), Length(max=50)])
    lastname = StringField("Last Name", validators=[InputRequired(), Length(max=50)])

class LoginForm(FlaskForm):
    """Form to login user."""
    email = StringField("Email", validators=[InputRequired(), Email(), Length(max=254)])
    password = PasswordField("Password", validators=[InputRequired()])

class UserEditForm(FlaskForm):
    """Form for editing user."""
    firstname = StringField("First Name", validators=[InputRequired(), Length(max=50)])
    lastname = StringField("Last Name", validators=[InputRequired(), Length(max=50)])