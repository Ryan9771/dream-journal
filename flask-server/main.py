"""WSGI and local-development entry point for Recall."""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

from app import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.getenv("PORT", "5001")),
        debug=os.getenv("FLASK_DEBUG") == "1",
    )
