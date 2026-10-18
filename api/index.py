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
        qs = environ.get('QUERY_STRING', '')
        route_path = None

        if '__route__=' in qs:
            params = urllib.parse.parse_qs(qs)
            routes = params.get('__route__')
            if routes and routes[0]:
                route_path = routes[0]
                if not route_path.startswith('/'):
                    route_path = '/' + route_path
                # Clean __route__ from query string so request.args stays clean
                clean_parts = [p for p in qs.split('&') if not p.startswith('__route__=')]
                environ['QUERY_STRING'] = '&'.join(clean_parts)

        if not route_path:
            matched_path = environ.get('HTTP_X_MATCHED_PATH')
            if matched_path:
                route_path = matched_path

        current_path = environ.get('PATH_INFO', '')
        if route_path:
            environ['PATH_INFO'] = route_path
        elif current_path in ('/api/index.py', '/api/index', '/api'):
            environ['PATH_INFO'] = '/'
        elif current_path.startswith('/api/index.py/'):
            environ['PATH_INFO'] = current_path[len('/api/index.py'):]
        elif current_path.startswith('/api/index/'):
            environ['PATH_INFO'] = current_path[len('/api/index'):]

        environ['SCRIPT_NAME'] = ''
        return self.wsgi(environ, start_response)


app = VercelWSGIMiddleware(flask_app)
