"""Vercel entrypoint for the DataCo late-delivery inference API.

Vercel's Python runtime discovers ASGI applications from conventional module
names such as ``index.py``.  Keep the implementation in ``predict.py`` and
re-export the existing FastAPI application here so the deployment uses the
same routes, model, and validation logic locally and in production.
"""

from api.predict import app

__all__ = ["app"]
