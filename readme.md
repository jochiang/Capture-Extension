# Content Capture & Search Chrome Extension

A Chrome extension that captures content from whitelisted websites, stores it in a vector database, and enables semantic search and LLM-powered retrieval of your browsing history.

## Features

- **Domain Whitelisting**: Capture content only from websites you specifically approve
- **Automatic Content Extraction**: Intelligently extracts main content from web pages
- **Vector Search**: Semantic search through your captured browsing history
- **LLM Integration**: Use Ollama to query your browsing history with natural language
- **Content Management**: View, filter, and delete stored content

## Installation

1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select the extension directory

## Server Setup

1. Install server dependencies: `pip install -r server/requirements.txt`
2. Start the server: `python server/server.py`
3. The server runs on http://localhost:5000 by default

## Usage

1. Click the extension icon to open the popup
2. Add domains to your whitelist
3. Browse websites - content from whitelisted domains will be automatically captured
4. Use the search tab to find content in your browsing history
5. Configure Ollama integration to enable LLM queries of your content

## Configuration

- **Server URL**: By default, the extension connects to http://localhost:5000
- **Ollama Settings**: Configure URL and model for LLM integration
- **Whitelist Management**: Add and remove domains from your whitelist

## Privacy

All data is stored locally on your server. No content is sent to third parties, unless if you opt to use Google Gemini for your LLM queries. Ollama is the default configuration.

## License

MIT