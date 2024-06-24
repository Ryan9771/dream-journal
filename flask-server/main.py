from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from flask_bcrypt import Bcrypt
from dotenv import dotenv_values

# Secrets
secrets = dotenv_values(".env")

# Setting up the app
app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config["SQLALCHEMY_DATABASE_URI"] = secrets["SQLALCHEMY_DATABASE_URI"]
app.config["JWT_SECRET_KEY"] = secrets["JWT_KEY"]

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)


# ======= Models =======
class User(db.Model):
    """User Model"""

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(150), nullable=False)

    def __init__(self, username, password):
        self.username = username
        self.password = bcrypt.generate_password_hash(password).decode("utf-8")


class DreamEntry(db.Model):
    """Dream Entry Model"""

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    content = db.Column(db.Text, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    emotion = db.Column(db.String(150), nullable=False)

    def __init__(self, date, content, user_id, emotion):
        self.date = date
        self.content = content
        self.user_id = user_id
        self.emotion = emotion

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date,
            "content": self.content,
            "user_id": self.user_id,
            "emotion": self.emotion,
        }


@app.route("/")
def home():
    return "Flask server works!"


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    """
    Request Type:
    {
        "username": "username",
        "password": "password"
    } 
    """
    username = data["username"]
    password = data["password"]

    # Check the db for said user
    user = User.query.filter_by(username=username).first()

    if user and bcrypt.check_password_hash(user.password, password):
        access_token = create_access_token(identity=user.id)
        return (
            jsonify({"message": "Login successful", "access_token": access_token}),
            200,
        )

    if not user:
        print("User not found", flush=True)

    return jsonify({"message": "Invalid credentials"}), 401


@app.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()
    """
    Request Type:
    {
        "username": "username",
        "password": "password"
    }
    """

    # User already exists
    if User.query.filter_by(username=data["username"]).first():
        print("User already exists", flush=True)
        return jsonify({"message": "User already exists"}), 400

    new_user = User(data["username"], data["password"])

    # Add user to the database
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "User created successfully"}), 201


@app.route("/entry", methods=["POST"])
def get_entry():
    pass


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000, debug=True)
