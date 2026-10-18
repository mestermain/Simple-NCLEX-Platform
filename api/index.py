import os
import sys
import urllib.parse

# Ensure project root is in sys.path
root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app import app as flask_app


class VercelWSGIMiddleware:
    """Fix Vercel serverless rewritten paths so Flask routes match accurately."""
    def __init__(self, wsgi):
        self.wsgi = wsgi

    def __call__(self, environ, start_response):
        matched_path = environ.get('HTTP_X_MATCHED_PATH')
        if not matched_path:
            matches = environ.get('HTTP_X_NOW_ROUTE_MATCHES')
            if matches:
                for part in matches.split('&'):
                    if part.startswith('1='):
                        matched_path = '/' + urllib.parse.unquote(part[2:])
                        break

        current_path = environ.get('PATH_INFO', '')
        if matched_path:
            environ['PATH_INFO'] = matched_path
        elif current_path in ('/api/index.py', '/api/index', '/api'):
            environ['PATH_INFO'] = '/'
        elif current_path.startswith('/api/index.py/'):
            environ['PATH_INFO'] = current_path[len('/api/index.py'):]
        elif current_path.startswith('/api/index/'):
            environ['PATH_INFO'] = current_path[len('/api/index'):]

        return self.wsgi(environ, start_response)


app = VercelWSGIMiddleware(flask_app)
