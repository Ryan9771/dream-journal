"""Firebase Admin initialization shared by repositories and services."""

import firebase_admin
from firebase_admin import firestore

from app.config import FIRESTORE_DATABASE_ID

if not firebase_admin._apps:
    firebase_admin.initialize_app()

if not FIRESTORE_DATABASE_ID:
    raise RuntimeError(
        "FIRESTORE_DATABASE_ID is required; refusing to connect implicitly "
        "to the default Firestore database."
    )

db = firestore.client(database_id=FIRESTORE_DATABASE_ID)
