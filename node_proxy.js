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
  console.log(`Proxy server running on http://localhost:${port}`);
  console.log('API requests will be proxied to http://localhost:8080');
  console.log('Press Ctrl+C to stop the server');
});
