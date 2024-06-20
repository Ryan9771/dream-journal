from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


# Members API Route
@app.route("/members")
def members():
    print("\n====== Hey hows it going======\n", flush=True)
    return jsonify({"members": ["member1", "member2", "member3"]})


@app.route("/")
def home():
    return "Hello world"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
