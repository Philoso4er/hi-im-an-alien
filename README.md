# 👽 Hi I'm an Alien - AR Conversation Game

A unique AR-style mobile game where mysterious aliens appear in your world through your phone's camera. Spot them, say hi before they vanish, and have deep philosophical conversations powered by AI!

## ✨ Key Features

- **🎯 Discovery Gameplay**: Aliens randomly appear at screen edges - you have 5 seconds to respond!
- **💬 AI-Powered Conversations**: Each encounter features unique, cryptic conversations powered by Google Gemini AI
- **🎤 Voice Interaction**: Speak naturally to aliens using Web Speech API (optional)
- **⏱️ Time-Limited Encounters**: 90-second conversations create urgency and value
- **📚 Encounter Collection**: Review all past conversations with timestamps
- **🌈 Holographic Visuals**: Beautiful iridescent alien with cyan→purple→pink→orange gradients
- **📱 AR-Style Effects**: Device motion creates parallax depth illusion
- **🧠 Alien Memory**: The alien vaguely remembers past conversations


## 🎮 How to Play

1. **START EXPLORING** - Camera activates and you enter discovery mode
2. **SPOT THE ALIEN** - Watch for aliens appearing at screen edges with portal effects
3. **SAY HI!** - Tap the glowing button within 5 seconds before the alien vanishes
4. **CONVERSE** - Chat via text or voice for up to 90 seconds
5. **COLLECT MEMORIES** - Each encounter is saved to your collection

## 🤖 About the Alien

The alien is a mysterious observer of humanity with a cryptic, philosophical personality:

- Curious about human behavior, rituals, and technology
- References "cycles," "observations," and "patterns"
- Asks thought-provoking questions about everyday things
- Fascinated by coffee, phones, sleep, emotions
- Vaguely remembers past conversations
- Speaks in brief, mysterious statements (1-3 sentences)

Example conversations:
> **Alien**: "Greetings, human... I've been observing your species. Tell me, what drives you?"
> 
> **You**: "I guess curiosity and the need to connect with others"
> 
> **Alien**: "Fascinating... Your species seeks connection yet builds walls. Why do you glow from rectangles at night?"

## 🛠️ Tech Stack

- **React 19** + **TypeScript** - Modern UI framework
- **Framer Motion** - Smooth animations and transitions
- **Google Gemini AI** - Powers alien conversation intelligence
- **Web Speech API** - Voice recognition & synthesis
- **MediaDevices API** - Camera access for AR background
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling

## 📁 Project Structure

```
alien-app/
├── components/
│   ├── Alien.tsx                    # Holographic alien character
│   ├── CameraFeed.tsx               # Camera video feed
│   ├── SayHiButton.tsx              # Initial interaction button
│   ├── ConversationInterface.tsx    # Chat interface
│   └── EncounterCollection.tsx      # Past conversations viewer
├── services/
│   ├── geminiService.ts            # AI conversation logic
│   ├── audioService.ts             # Procedural sound effects
│   ├── voiceService.ts             # Speech recognition/synthesis
│   └── storageService.ts           # LocalStorage for encounters
├── App.tsx                          # Main game logic
├── types.ts                         # TypeScript definitions
├── index.tsx                        # Entry point
├── .env.example                     # Environment template
├── package.json                     # Dependencies
└── vite.config.ts                   # Build configuration
```

## 🎨 Visual Design

### Holographic Alien
- **Gradient**: Cyan (#06b6d4) → Purple (#a855f7) → Pink (#ec4899) → Orange (#fb923c)
- **Glow effect**: SVG filters create ethereal shimmer
- **Animations**: 
  - IDLE: Gentle floating and arm waves
  - NOTICED: Excited arm raise when acknowledged
  - LISTENING: Attentive pose during voice input
  - THINKING: Pulsing with blinking eyes
  - TALKING: Animated mouth and gestures
  - MISSED: Sad fade out

### Portal Effect
- Rotating dashed ring with cyan glow
- Appears with alien spawn
- Spins out when alien departs

### AR Depth Illusion
- **No AR frameworks needed** - pure CSS + device motion
- Position-based blur and scale
- Device tilt creates parallax offset
- Creates convincing 3D effect

## 🔧 Customization

### Adjust Conversation Time
In `App.tsx`:
```typescript
const CONVERSATION_TIME_LIMIT = 90; // Change to your preferred seconds
```

### Modify Spawn Rate
In `App.tsx`:
```typescript
const ALIEN_MIN_INTERVAL = 3000; // Minimum time between spawns
const ALIEN_MAX_INTERVAL = 6000; // Maximum time between spawns
const ALIEN_VISIBLE_DURATION = 5000; // Time to say hi
```

### Customize Alien Personality
Edit `services/geminiService.ts` in the `getAlienPersonality()` function to change:
- Tone and speaking style
- Topics of interest
- Question types
- Memory references

### Add New Sound Effects
In `services/audioService.ts`, add new cases to the `play()` method with Web Audio API oscillators.

## 🐛 Troubleshooting

**Camera not working?**
- Ensure you're using **HTTPS** or **localhost**
- Check browser permissions (Settings → Site Settings → Camera)
- Try Chrome or Safari (best compatibility)
- Make sure no other app is using the camera

**Voice not working?**
- Voice requires **HTTPS** (or localhost for development)
- Check microphone permissions
- Web Speech API support: Chrome (desktop/mobile), Safari (iOS 14.5+)
- Not supported in Firefox or some browsers

**Alien not appearing?**
- Check browser console for errors
- Ensure game is in PLAYING mode (not menu)
- Try refreshing the page
- Verify API key is set correctly in `.env`

**No AI responses?**
- Verify Gemini API key in `.env` file
- Check browser console for API errors
- Ensure you have internet connection
- Fallback responses work without API key

**Blank screen on mobile?**
- Use Chrome or Safari browser
- Allow camera permissions in browser settings
- Try opening in incognito/private mode
- Clear browser cache and reload

## 📱 Mobile Best Practices

- **Portrait mode** recommended for best experience
- **Good lighting** helps camera feed look better
- **Headphones** recommended for voice input (reduces echo)
- **Stable internet** required for AI responses
- **Allow permissions** for camera and microphone

## 🚢 Deployment

### Build for Production
```bash
npm run build
```

This creates a `dist/` folder with optimized files.

### Deploy to Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variable: `VITE_GEMINI_API_KEY`
4. Deploy!

### Deploy to Netlify
1. Drag `dist/` folder to Netlify
2. Or connect GitHub repo
3. Add environment variable in Netlify dashboard
4. Deploy!

### Deploy to GitHub Pages
```bash
npm run build
# Copy dist/ contents to your gh-pages branch
```

**Important**: Set `VITE_GEMINI_API_KEY` in your hosting platform's environment variables!

## 🎯 Future Enhancement Ideas

- [ ] Multiple alien personalities (curious, wise, playful, mysterious)
- [ ] Location-based spawning (aliens appear near landmarks)
- [ ] Time-of-day variations (aliens change mood with sun/moon)
- [ ] Shareable conversation screenshots
- [ ] Achievement system (encounter milestones)
- [ ] Alien progression (unlock deeper conversations)
- [ ] Community features (see what others asked)
- [ ] Real AR tracking with ARKit/ARCore
- [ ] Alien customization options

## 💡 Design Philosophy

**Not a chatbot** - It's a discovery-based character encounter
**Not traditional AR** - Works instantly on any phone browser
**Not grindy gameplay** - Short, meaningful moments over repetition
**Not productivity** - Pure curiosity-driven entertainment

The goal is to create **magical micro-moments** where you genuinely feel like you've met something otherworldly.

## 📄 License

MIT License - Feel free to use, modify, and share!

---

**Ready to meet some aliens?** 👽✨

```bash
npm install
npm run dev
```

Open the app on your phone, allow camera access, and start exploring. The aliens are waiting... 🛸
