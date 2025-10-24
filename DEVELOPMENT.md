# 🛠️ Development Guide

## Quick Start Commands

```bash
# Setup everything (Ollama + model)
bun run setup

# Start development server
bun dev

# Open in browser
open http://localhost:3000
```

## Project Structure Overview

```
src/
├── app/                    # Next.js App Router
│   ├── globals.css        # Global styles + animations
│   ├── layout.tsx         # Root layout component
│   └── page.tsx          # Main application page
├── components/            # React components
│   ├── Avatar.tsx        # 3D avatar with Three.js
│   ├── VoiceControls.tsx # Microphone + settings UI
│   ├── Subtitles.tsx     # Speech bubbles
│   └── ConnectionIndicator.tsx # Ollama status
├── hooks/                 # Custom React hooks
│   ├── useVoice.ts       # Speech recognition/synthesis
│   └── useOllama.ts      # AI API integration
└── types/                 # TypeScript declarations
    └── globals.d.ts      # Global type definitions
```

## Key Features Implementation

### 🎤 Voice Recognition

- **File**: `src/hooks/useVoice.ts`
- **API**: Web Speech API (Chrome/Edge only)
- **Features**: Real-time transcription, speech synthesis

### 🤖 AI Integration

- **File**: `src/hooks/useOllama.ts`
- **API**: Ollama REST API (`http://localhost:11434`)
- **Models**: deepseek-r1:1.5b (changeable)

### 🎭 3D Avatar

- **File**: `src/components/Avatar.tsx`
- **Library**: React Three Fiber + Drei
- **Features**: Breathing, blinking, mouth movement

### 🎨 UI/Animations

- **Styling**: Tailwind CSS v4
- **Animations**: Framer Motion
- **Theme**: Futuristic dark with blue accents

## Customization Guide

### Change AI Model

1. **Download new model**:

   ```bash
   ollama pull llama2
   # or ollama pull codellama
   # or ollama pull mistral
   ```

2. **Update model name** in `src/hooks/useOllama.ts`:
   ```typescript
   body: JSON.stringify({
     model: 'llama2', // Change this
     prompt: fullPrompt,
     stream: false,
   }),
   ```

### Add New AI Personality

Edit `src/hooks/useOllama.ts`:

```typescript
export const SYSTEM_PROMPTS = {
  // ... existing prompts
  chef: "You are a professional chef. Help users with cooking, recipes, and culinary techniques.",
  translator:
    "You are a language expert. Help translate and explain languages.",
} as const;
```

### Replace 3D Avatar

1. **Get a model**: Download .glb/.gltf from Ready Player Me, Mixamo, or Sketchfab
2. **Place in**: `public/models/avatar.glb`
3. **Update component**: Follow instructions in `src/components/Avatar.tsx`

### Customize Styling

- **Colors**: Edit CSS variables in `src/app/globals.css`
- **Layout**: Modify component styles directly
- **Animations**: Adjust Framer Motion props

## Browser Support

| Feature           | Chrome | Edge | Safari | Firefox |
| ----------------- | ------ | ---- | ------ | ------- |
| 3D Avatar         | ✅     | ✅   | ✅     | ✅      |
| Voice Recognition | ✅     | ✅   | ❌     | ❌      |
| Text-to-Speech    | ✅     | ✅   | ✅     | ✅      |
| AI Integration    | ✅     | ✅   | ✅     | ✅      |

**Recommendation**: Use Chrome or Edge for full functionality.

## Performance Tips

### Optimize 3D Performance

- Keep avatar models under 5MB
- Use compressed textures
- Limit animation complexity
- Use LOD (Level of Detail) if needed

### Reduce Bundle Size

- Import only needed Three.js components
- Use dynamic imports for heavy components
- Optimize images and assets

### API Optimization

- Implement response caching
- Add request debouncing
- Use streaming for long responses

## Debugging

### Common Issues

**"Voice not working"**

- Check browser (Chrome/Edge required)
- Verify microphone permissions
- Ensure HTTPS in production

**"Ollama connection failed"**

- Check if Ollama is running: `ollama serve`
- Verify model exists: `ollama list`
- Test API directly: `curl http://localhost:11434/api/version`

**"Avatar not loading"**

- Check browser console for WebGL errors
- Verify model file path and format
- Test with simple geometry first

**"Performance issues"**

- Open React DevTools Profiler
- Check Three.js stats (add stats.js)
- Monitor network tab for large requests

### Development Tools

```bash
# Type checking
npx tsc --noEmit

# Linting
bun run lint

# Bundle analysis
npx @next/bundle-analyzer

# Performance monitoring
npm install --save-dev @next/bundle-analyzer
```

## Deployment

### Environment Variables

Create `.env.local`:

```
NEXT_PUBLIC_OLLAMA_URL=http://localhost:11434
```

### Build for Production

```bash
bun run build
bun start
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. **Fork the repo**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push to branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber)
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Framer Motion](https://www.framer.com/motion/)

Happy coding! 🚀
