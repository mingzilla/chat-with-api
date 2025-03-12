#!/bin/bash

# Make the script executable if not already
chmod +x proxy_server.py

# Create a more robust alternative using Node.js if Python streaming fails
if [ "$1" == "--node" ]; then
    echo "Setting up Node.js proxy server (first run may take a minute)..."
    
    # Create package.json if it doesn't exist
    if [ ! -f "package.json" ]; then
        cat > package.json << EOF
{
  "name": "api-proxy",
  "version": "1.0.0",
  "description": "Simple API proxy for local development",
  "main": "node_proxy.js",
  "scripts": {
    "start": "node node_proxy.js"
  },
  "dependencies": {
    "express": "^4.17.1",
    "http-proxy-middleware": "^2.0.6",
    "cors": "^2.8.5"
  }
}
EOF
    fi
    
    # Create node_proxy.js if it doesn't exist
    if [ ! -f "node_proxy.js" ]; then
        cat > node_proxy.js << EOF
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const app = express();
const port = 8081;

// Serve static files from current directory
app.use(express.static('./'));

// Enable CORS
app.use(cors());

// Proxy API requests to localhost:8080
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:8080',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '' // Remove the /api prefix when forwarding
  },
  // Ensure streaming responses are properly forwarded
  onProxyRes: (proxyRes, req, res) => {
    // Preserve the Transfer-Encoding header for streaming
    if (proxyRes.headers['transfer-encoding'] === 'chunked') {
      res.setHeader('Transfer-Encoding', 'chunked');
    }
  }
}));

app.listen(port, () => {
  console.log(\`Proxy server running on http://localhost:\${port}\`);
  console.log('API requests will be proxied to http://localhost:8080');
  console.log('Press Ctrl+C to stop the server');
});
EOF
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo "npm not found. Checking for nvm..."
        
        # Source nvm if it exists
        if [ -f "$HOME/.nvm/nvm.sh" ]; then
            . "$HOME/.nvm/nvm.sh"
        elif [ -f "/usr/local/opt/nvm/nvm.sh" ]; then
            . "/usr/local/opt/nvm/nvm.sh"
        fi
        
        # Check again for npm after sourcing nvm
        if ! command -v npm &> /dev/null; then
            echo "Error: npm not found even after sourcing nvm. Please install Node.js manually."
            exit 1
        fi
    fi
    
    # Install dependencies and start the Node.js server
    npm install
    node node_proxy.js
else
    # Run the Python proxy server
    echo "Starting Python proxy server on http://localhost:8081"
    echo "If you experience streaming issues, run './enhanced-proxy.sh --node' to use the Node.js version"
    python3 proxy_server.py
fi