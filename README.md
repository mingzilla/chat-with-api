# API Chat Client

A lightweight, browser-based chat interface for interacting with API endpoints that support streaming or standard responses.

## Project Overview

This application provides a simple, intuitive interface to send prompts to API endpoints and display responses in a conversation format. It supports both streaming and non-streaming API responses, with built-in CORS handling for local development.

## File Structure

```
api-chat-client/
├── index.html            # Main HTML file
├── styles.css            # CSS styling
├── script.js             # Main application logic
├── proxy_server.py       # Python-based proxy server for CORS handling
├── enhanced-proxy.sh     # Script to start proxy with fallback options
└── README.md             # This documentation
```

## Features

- **Dual request modes**: Choose between streaming and non-streaming API calls
- **Conversation interface**: Alternating message display for a natural chat experience
- **Token security**: Password field for secure API token entry
- **CORS handling**: Built-in proxy server for local development
- **Modern UI**: Clean, responsive design with subtle animations
- **Message clearing**: One-click conversation reset while preserving connection settings
- **Streaming text processing**: Handles various streaming response formats
- **Auto-focus**: Cursor automatically returns to input field after responses

## Usage

### Simple Deployment

For basic usage without CORS concerns:

```bash
# Start a simple HTTP server on port 8081
python -m http.server 8081
```

Then access the application at:
```
http://localhost:8081
```

### Local Development with Proxy (Recommended)

To handle CORS when accessing APIs on a different port:

1. Make the proxy server executable:
```bash
chmod +x proxy_server.py
chmod +x enhanced-proxy.sh
```

2. Start the proxy server:
```bash
./enhanced-proxy.sh
```

3. Access the application at:
```
http://localhost:8081
```

4. If you experience streaming issues, try the Node.js proxy option:
```bash
./enhanced-proxy.sh --node
```

### Public Access

The application is also available online at:

~~~
https://mingzilla.github.io/chat-with-api/
~~~

## Configuration

1. **URL**: Enter the API endpoint URL (uses `/api/` prefix with proxy)
2. **Token**: Enter your API authorization token
3. **Request Mode**: Select between:
   - Single Response: Standard API call (recommended)
   - Stream Response: For APIs that support streaming
4. **Prompt**: Enter your message and press Enter or click Send

## How It Works

### Client-Side

The application makes API requests using a lightweight client library. It handles:
- Token-based authentication
- JSON request formatting
- Response parsing and rendering
- Streaming response processing

### Proxy Server

For local development, the included proxy server:
- Serves static files (HTML, CSS, JS)
- Forwards API requests to avoid CORS issues
- Preserves headers including authorization
- Supports streaming responses
- Provides fallback options for different environments

## Dependencies

- api-client.js: Lightweight API interaction library
- Python 3.x: For the proxy server (optional)
- Node.js: For the alternative proxy server (optional)

## Advanced Configuration

### Python Proxy

The Python proxy (`proxy_server.py`) can be configured by editing:
- `PORT`: The port to serve the application (default: 8081)
- `API_HOST`: The target API host (default: http://localhost:8080)

### Node.js Proxy

The Node.js proxy is automatically generated and can be configured in `node_proxy.js` after first creation.

## Notes

- The application works best with APIs that return JSON responses
- Supported streaming formats include OpenAI, Anthropic, and standard formats
- All API requests are made directly from the browser via the proxy
- API tokens are never stored outside your browser session