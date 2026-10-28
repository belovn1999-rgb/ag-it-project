"""How old a cached source page may be before the monthly refresh reads it again (B61 stage 21, owner 2026-10-23).

The crawlers keep every page they read and never ask again — so new generations and versions would never come in.
With AUTOGOOD_REFRESH_DAYS=30 (tools/refresh-model-catalog.py sets it) a list page older than that — a model, a
generation, a body page; not one version's page, it does not change — is read again. The old copy waits aside
and comes back if the site does not answer, so a refresh never loses a page.

    if cache_age.begin(path):      # stale: the old copy is put aside, fetch as usual
        ...fetch into path...
    cache_age.finish(path, min_size)   # the new page if it is a real one, else the old copy back
"""
import os
import time


def stale(path):
    days = os.environ.get("AUTOGOOD_REFRESH_DAYS")
    if not days or not os.path.exists(path):
        return False
    return time.time() - os.path.getmtime(path) > float(days) * 86400


def begin(path):
    """Put a stale page aside (True); the caller then fetches it as if it were missing."""
    if stale(path):
        os.replace(path, path + ".old")
        return True
    return False


def finish(path, min_size):
    """Keep the new page if it is a real one, else bring the old copy back."""
    old = path + ".old"
    if not os.path.exists(old):
        return
    if os.path.exists(path) and os.path.getsize(path) > min_size:
        os.remove(old)
    else:
        os.replace(old, path)
