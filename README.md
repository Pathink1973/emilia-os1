# Emilia Chat AI

A voice-interactive AI chat application featuring real-time speech recognition, natural language processing, and voice responses.

## Features

- 🎤 Voice-based interaction
- 🤖 AI-powered conversations using OpenAI's GPT
- 🗣️ Text-to-speech for AI responses
- 📝 Speech-to-text using Whisper API
- 🌊 Interactive wave animation
- 🔄 Automatic silence detection
- 💬 Conversation history

## Tech Stack

- Frontend: Vanilla JavaScript
- Build Tool: Vite
- APIs: OpenAI (Whisper and ChatGPT)
- Deployment: Netlify

## Setup

1. Clone the repository
2. Copy `.env.example` to `.env` and add your OpenAI API key
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run development server:
   ```bash
   npm run dev
   ```

## Build

To build for production:
```bash
npm run build
```

## Environment Variables

Required environment variables in `.env`:
- `OPENAI_API_KEY`: Your OpenAI API key

## License

MIT
