#!/usr/bin/env python3
import http.server
import socketserver
import urllib.request
import urllib.error
import ssl
import json
import os
from urllib.parse import urlparse, parse_qs

# Configuration
PORT = 8081
API_HOST = "http://localhost:8080"

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    # Handle all requests
    def do_GET(self):
        # Serve static files (HTML, CSS, JS)
        if not self.path.startswith('/api/'):
            return http.server.SimpleHTTPRequestHandler.do_GET(self)
        
        # Proxy API requests
        self._proxy_request('GET')
    
    def do_POST(self):
        # Proxy API requests
        if self.path.startswith('/api/'):
            self._proxy_request('POST')
        else:
            self.send_error(404, "Not Found")
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Max-Age', '86400')  # 24 hours
        self.end_headers()
    
    def _proxy_request(self, method):
        # Remove /api prefix and construct target URL
        target_path = self.path[4:]  # Remove '/api'
        target_url = f"{API_HOST}{target_path}"
        
        print(f"Proxying {method} request: {self.path} -> {target_url}")
        
        # Get request body for POST requests
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        
        # Copy headers from the original request
        headers = {}
        for header in self.headers:
            if header.lower() not in ('host', 'content-length'):
                headers[header] = self.headers[header]
        
        # Ensure proper content type for API requests
        if method == 'POST' and body:
            if 'content-type' not in map(str.lower, headers.keys()):
                headers['Content-Type'] = 'application/json'
        
        try:
            # Create request
            req = urllib.request.Request(
                url=target_url,
                data=body,
                headers=headers,
                method=method
            )
            
            # Send the request to the target server
            with urllib.request.urlopen(req) as response:
                # Copy response status and headers
                self.send_response(response.status)
                
                # Add CORS headers
                self.send_header('Access-Control-Allow-Origin', '*')
                
                # Copy response headers
                for header, value in response.getheaders():
                    if header.lower() not in ('access-control-allow-origin', 'content-length'):
                        self.send_header(header, value)
                
                self.end_headers()
                
                # Stream the response body back to the client
                # This is especially important for streaming API responses
                chunk_size = 1024  # Smaller chunks for more responsive streaming
                self.wfile.flush()  # Ensure headers are sent immediately
                
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    self.wfile.write(chunk)
                    self.wfile.flush()  # Important: flush after each chunk for streaming
        
        except urllib.error.HTTPError as e:
            # Forward HTTP errors from the API
            self.send_response(e.code)
            
            # Add CORS headers
            self.send_header('Access-Control-Allow-Origin', '*')
            
            # Copy error response headers
            for header, value in e.headers.items():
                if header.lower() not in ('access-control-allow-origin', 'content-length'):
                    self.send_header(header, value)
            
            self.end_headers()
            
            # Forward error body
            if e.fp:
                error_body = e.read()
                self.wfile.write(error_body)
        
        except Exception as e:
            # Handle other errors
            self.send_error(500, f"Proxy Error: {str(e)}")

def run_server():
    handler = ProxyHandler
    
    # Set a longer timeout for streaming responses
    handler.timeout = 300  # 5 minutes timeout
    
    # Allow socket reuse to prevent "Address already in use" errors
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.TCPServer(("", PORT), handler)
    
    print(f"Serving at http://localhost:{PORT}")
    print(f"API requests will be proxied to {API_HOST}")
    print("Press Ctrl+C to stop the server")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server")
        httpd.shutdown()

if __name__ == "__main__":
    run_server()