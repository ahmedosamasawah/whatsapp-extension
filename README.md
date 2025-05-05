# WhatsApp AI Transcriber Plus

A browser extension that adds voice message transcription functionality to WhatsApp Web, using OpenAI's Whisper API.

## Features

- Transcribe voice messages in WhatsApp Web with a single click
- Get cleaned text with grammar fixes and filler word removal
- Generate concise summaries of voice messages
- Get AI-suggested replies to voice messages
- Uses OpenAI's Whisper API for accurate transcriptions
- Caches transcriptions for repeated access
- Modern UI built with Svelte and Tailwind CSS

## Development

This extension is built with:

- Vite for fast builds and development
- Svelte for UI components
- TypeScript for type safety
- Tailwind CSS for styling
- Chrome Extensions Manifest V3

### Project Setup

```bash
# Install dependencies
pnpm install

# Run development server
pnpm run dev

# Build for production
pnpm run build

# Create a packaged zip for distribution
pnpm run package
```

### Project Structure

```
whatsapp-transcriber-plus/
├── src/
│   ├── assets/         # Icons and static assets
│   │   └── icons/
│   ├── background/     # Background script
│   │   └── index.ts
│   ├── components/     # Shared Svelte components
│   ├── content/        # Content scripts for WhatsApp Web
│   │   ├── content.css
│   │   ├── hook.ts     # Audio interception script
│   │   └── index.ts    # Main content script
│   ├── lib/           # Utility functions and stores
│   │   ├── api.ts     # API client for OpenAI
│   │   ├── stores.ts  # Svelte stores
│   │   └── utils.ts   # Helper functions
│   ├── options/       # Options page
│   │   ├── index.html
│   │   └── index.ts
│   ├── popup/         # Extension popup
│   │   ├── index.html
│   │   └── index.ts
│   └── app.css        # Global styles
├── .gitignore
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

## Usage

1. Install the extension
2. Configure your OpenAI API key in the extension settings
3. Open WhatsApp Web
4. When you see a voice message, a "Transcribe" button will appear
5. Click the button to transcribe and analyze the voice message

## API Key

This extension requires an OpenAI API key to function. You can get one by:

1. Creating an account at [OpenAI Platform](https://platform.openai.com/signup)
2. Navigating to [API Keys](https://platform.openai.com/api-keys) in your account dashboard
3. Creating a new secret key

Note: The OpenAI API is a paid service. You will be charged based on your usage.
