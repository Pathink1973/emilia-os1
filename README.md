# 🎙️ Emilia AI Assistant

An elegant, voice-interactive AI assistant that combines the power of OpenAI's GPT-4 with Eleven Labs' natural voice synthesis. Emilia provides a seamless, conversational experience with both voice input and output.

## ✨ Features

- 🎤 **Voice Interaction**: Natural voice input through your device's microphone
- 🤖 **Advanced AI**: Powered by GPT-4 for intelligent, context-aware responses
- 🗣️ **Natural Voice**: Lifelike voice responses using Eleven Labs' voice synthesis
- 📱 **Mobile-First**: Optimized for both desktop and mobile devices
- 🔒 **Secure**: Environment variables for API key protection
- 💫 **Modern UI**: Clean, responsive interface with smooth animations

## 🚀 Quick Start

1. **Clone the Repository**
   ```bash
   git clone https://github.com/yourusername/emilia-ai-assistant.git
   cd emilia-ai-assistant
   ```

2. **Configure API Keys**
   ```bash
   cp config.example.js config.js
   ```
   Edit `config.js` with your API keys for local development

3. **Run Locally**
   ```bash
   python3 -m http.server 5178
   ```

4. **Open in Browser**
   Visit `http://localhost:5178`

## 🛠️ Technologies

- **Frontend**:
  - HTML5 & CSS3
  - Vanilla JavaScript (ES6+)
  - WebRTC for audio capture
  - Web Audio API
  
- **AI & Voice**:
  - OpenAI GPT-4
  - OpenAI Whisper
  - Eleven Labs Voice Synthesis

## 🔑 Environment Setup

### Local Development
Create a `config.js` file with your API keys:
```javascript
const config = {
    OPENAI_API_KEY: 'your-openai-key',
    ELEVEN_LABS_API_KEY: 'your-eleven-labs-key',
    // ... other config
};
```

### Production (Netlify)
Set these environment variables in your Netlify dashboard:
- `OPENAI_API_KEY`
- `ELEVEN_LABS_API_KEY`

## 📱 Mobile Support

Emilia works great on mobile devices with:
- Touch-optimized interface
- iOS & Android compatibility
- Responsive design
- PWA capabilities

## 🚀 Deployment

### Netlify Deployment Steps

1. Push to GitHub
2. Connect repository to Netlify
3. Configure environment variables
4. Deploy!

## 🔒 Security Features

- Environment variables for API keys
- Secure headers configuration
- HTTPS enforcement
- Content Security Policy
- XSS protection

## 🎯 Usage Tips

1. Click/tap the microphone to start recording
2. Speak naturally to Emilia
3. Release or wait for silence to process
4. Listen to Emilia's voice response

## 📝 License

MIT License - feel free to use this project for your own purposes!

## 👥 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 🤝 Support

Need help? Open an issue or contact us at your-email@example.com

## 🌟 Credits

- Voice synthesis by [Eleven Labs](https://elevenlabs.io)
- AI powered by [OpenAI](https://openai.com)
- Created with ❤️ by Patrício Brito © 2025

---

Made with ❤️ for the AI community
