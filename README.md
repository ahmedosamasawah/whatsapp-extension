# WhatsApp AI Transcriber

A browser extension that adds voice message transcription functionality to WhatsApp Web, using OpenAI's Whisper API.

## Features

- Transcribe voice messages in WhatsApp Web with a single click
- Uses OpenAI's powerful Whisper API for accurate transcriptions
- Caches transcriptions for repeated access
- Supports dark mode
- Modern, WhatsApp-style UI

## Development

This extension is built with:

- Svelte for UI components
- Rollup for bundling
- Chrome Extensions Manifest V3

### Project Structure

```
whatsapp-transcriber/
├── public/
│   ├── manifest.json
│   └── assets/
│       └── icons/
├── src/
│   ├── content/
│   │   ├── App.svelte            # Main Svelte component for content
│   │   ├── TranscribeButton.svelte  # Button component
│   │   ├── TranscriptionModal.svelte # Modal with tabs
│   │   ├── content.js            # Content script entry
│   │   └── hook.js               # Audio intercept script
│   ├── popup/
│   │   ├── Popup.svelte          # Popup UI
│   │   └── popup.js              # Popup entry
│   ├── options/
│   │   ├── Options.svelte        # Options page UI
│   │   └── options.js            # Options entry
│   ├── background/
│   │   └── background.js         # Background script
│   └── lib/
│       ├── stores.js             # Svelte stores
│       ├── api.js                # API interaction
│       └── utils.js              # Utility functions
├── rollup.config.js              # Build configuration
├── package.json
└── README.md
```

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked" and select the `public` directory

## Usage

1. Install the extension
2. Open the extension popup and click "Open Settings"
3. Enter your OpenAI API key and save
4. Go to WhatsApp Web
5. When you see a voice message, a "Transcribe" button will appear
6. Click the button to transcribe the voice message

## API Key

This extension requires an OpenAI API key to function. You can get one by:

1. Creating an account at [OpenAI Platform](https://platform.openai.com/signup)
2. Navigating to [API Keys](https://platform.openai.com/api-keys) in your account dashboard
3. Creating a new secret key

Note: The OpenAI API is a paid service. You will be charged based on your usage.

## License

MIT
