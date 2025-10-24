# 🤖 AI Virtual Assistant - 3D Voice Interface

A futuristic AI-powered virtual assistant with 3D avatar, voice recognition, and integration with Ollama for local AI responses.

![AI Assistant Demo](https://img.shields.io/badge/Tech-Next.js%20%7C%20React%20Three%20Fiber%20%7C%20Tailwind-blue)

## ✨ Features

- 🎤 **Voice Input**: Speech-to-text using Web Speech API
- 🗣️ **Voice Output**: Text-to-speech with avatar mouth animations
- 🎭 **3D Avatar**: Interactive 3D character with breathing and talking animations
- 🧠 **AI Integration**: Local Ollama API integration with multiple personality modes
- 🎨 **Modern UI**: Futuristic interface with smooth animations
- 🔧 **Customizable**: Easy to swap AI models and 3D avatars

## 🚀 Quick Start

### Prerequisites

1. **Install Ollama** (for local AI):

   ```bash
   # On macOS
   brew install ollama

   # Or download from: https://ollama.ai
   ```

2. **Pull the AI model**:

   ```bash
   ollama pull deepseek-r1:7b
   ```

3. **Start Ollama server**:
   ```bash
   ollama serve
   ```

### Installation

1. **Clone and install dependencies**:

   ```bash
   git clone <your-repo>
   cd virtualassistant
   bun install
   ```

2. **Start the development server**:

   ```bash
   bun dev
   ```

3. **Open your browser** to `http://localhost:3000`

## 🎯 Usage

1. **Click the microphone button** to start voice recognition
2. **Speak your question** - you'll see it transcribed in real-time
3. **Wait for AI response** - the avatar will speak the answer aloud
4. **Change AI modes** using the settings button (Tech Tutor, Health Coach, etc.)

## 🔧 Configuration

### Switching AI Models

Edit `src/hooks/useOllama.ts` and change the model:

```typescript
body: JSON.stringify({
  model: 'llama2',  // Change this to any Ollama model
  prompt: fullPrompt,
  stream: false,
}),
```

Available models: `llama2`, `codellama`, `mistral`, `deepseek-r1:7b`, etc.

### Adding Custom 3D Avatar

1. Download a .glb/.gltf model from:

   - [Ready Player Me](https://readyplayer.me/) (recommended)
   - [Mixamo](https://www.mixamo.com/)
   - [Sketchfab](https://sketchfab.com/)

2. Place the file in `public/models/`

3. Follow instructions in `public/models/README.md`

### Customizing AI Personalities

Edit `src/hooks/useOllama.ts` to add new system prompts:

```typescript
export const SYSTEM_PROMPTS = {
  // ... existing prompts
  myCustomMode: "You are a [description] assistant. [Instructions]...",
} as const;
```

## 🏗️ Project Structure

```
src/
├── app/
│   ├── globals.css         # Global styles and animations
│   ├── layout.tsx          # Root layout
│   └── page.tsx           # Main application
├── components/
│   ├── Avatar.tsx         # 3D avatar with React Three Fiber
│   ├── VoiceControls.tsx  # Microphone and settings UI
│   └── Subtitles.tsx      # Real-time text display
└── hooks/
    ├── useVoice.ts        # Speech recognition & synthesis
    └── useOllama.ts       # AI API integration
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Styling**: Tailwind CSS v4
- **3D Graphics**: React Three Fiber + Drei
- **Animations**: Framer Motion
- **AI**: Ollama (local) with customizable models
- **Voice**: Web Speech API (browser native)
- **Language**: TypeScript

## 🌐 Browser Compatibility

- **Chrome**: Full support ✅
- **Edge**: Full support ✅
- **Safari**: Limited (no speech recognition) ⚠️
- **Firefox**: Limited (no speech recognition) ⚠️

## 🐛 Troubleshooting

### "Ollama connection failed"

- Ensure Ollama is running: `ollama serve`
- Check if model is downloaded: `ollama list`
- Verify server is on `http://localhost:11434`

### "Voice not supported"

- Use Chrome or Edge browser
- Enable microphone permissions
- Ensure HTTPS (required for speech API)

### Avatar not loading

- Check browser console for errors
- Ensure 3D model file is in `public/models/`
- Verify WebGL support in browser

### Performance Issues

- Reduce avatar model complexity
- Lower animation frame rate
- Close other browser tabs

## 📝 Development

### Adding New Features

1. **New AI Mode**: Add to `SYSTEM_PROMPTS` in `useOllama.ts`
2. **UI Components**: Create in `src/components/`
3. **Custom Hooks**: Add to `src/hooks/`
4. **Styling**: Update `globals.css` or component files

### Testing Changes

```bash
# Development server
bun dev

# Type checking
bun run build

# Linting
bun run lint
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🙏 Credits

- **React Three Fiber** for 3D rendering
- **Ollama** for local AI inference
- **Web Speech API** for voice features
- **Ready Player Me** for avatar creation tools

---

**Happy coding!** 🚀 If you build something cool with this, let us know!
