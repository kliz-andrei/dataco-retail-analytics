"""Vercel entrypoint for the DataCo late-delivery inference API.

Vercel's Python runtime discovers ASGI applications from conventional module
names such as ``index.py``.  Keep the implementation in ``predict.py`` and
re-export the existing FastAPI application here so the deployment uses the
same routes, model, and validation logic locally and in production.
"""

try:
    # Package import used by local ASGI servers and test tooling.
    from .predict import app
except ImportError:
    # Vercel's file-based loader may execute this module with ``api/`` as the
    # import root rather than importing it as the ``api`` package.
    from predict import app

__all__ = ["app"]
