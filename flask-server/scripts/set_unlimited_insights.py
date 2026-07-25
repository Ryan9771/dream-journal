"""Enable or disable unlimited daily insights for a verified Google-account email."""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.access import insight_access_document_id
from app.config import INSIGHT_ACCESS_COLLECTION
from app.firebase import db
from app.time import utcnow


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("email", help="Google-account email to manage")
    state = parser.add_mutually_exclusive_group(required=True)
    state.add_argument("--enable", action="store_true")
    state.add_argument("--disable", action="store_true")
    args = parser.parse_args()

    email = args.email.strip().lower()
    if "@" not in email:
        raise SystemExit("Enter a valid Google-account email address.")

    ref = db.collection(INSIGHT_ACCESS_COLLECTION).document(
        insight_access_document_id(email)
    )
    ref.set(
        {
            "active": args.enable,
            "unlimitedInsights": args.enable,
            "updatedAt": utcnow(),
        },
        merge=True,
    )
    state_label = "enabled" if args.enable else "disabled"
    print(f"Unlimited daily insights {state_label} for {email}.")


if __name__ == "__main__":
    main()
