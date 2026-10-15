# 👽 Hi I'm an Alien - AR Conversation Game

A unique AR-style mobile game where mysterious aliens appear in your world through your phone's camera. Spot them, say hi before they vanish, and have deep philosophical conversations powered by AI!

## 📲 Play / install

**Live:** https://hi-im-an-alien.vercel.app (free Vercel subdomain)

It's an installable PWA: full screen, its own icon, and it opens offline (the app shell and alien GIFs are cached by a service worker).

- **Android (Chrome):** open the link, tap **Install** on the title screen (or Chrome menu ⋮ → *Install app* / *Add to Home screen*).
- **iPhone / iPad (Safari):** open the link, tap **Install** on the title screen for the steps: **Share** → **Add to Home Screen** → **Add**. (In Chrome on iOS, Share is in the address bar.)
- **Desktop Chrome/Edge:** install icon in the address bar.

## 🕹️ Game shell

- **Title screen** with streak / contacts / forms-seen chips, Install, Sightings, Settings.
- **First-run onboarding:** how to play in 3 steps, then why we ask for the camera ("Use my camera" or "Play without camera"). Replay it from Settings.
- **Settings:** sound, voice (speech out + mic), vibration, camera backdrop on/off, reset all data.
- **Pause / resume:** pause button in-game and in the chat header; also pauses automatically when you leave the app. The 5-second say-hi window and the 90-second chat timer freeze while paused.
- **No camera / camera blocked:** the alien visits a starfield "room" with a floor and a doorway edge to peek around, and a small notice explains how to re-enable the camera.

## 🛸 Sightings, streaks and rare forms

All stored in `localStorage` on the device, no backend.

- **Sightings codex** (`components/SightingsCodex.tsx`): *Forms* (7 variants, locked until seen), *Log* (every conversation with its variant, date, length and a memorable alien line), *Stats* (sightings, hit rate, fastest hi, time talking, streaks).
- **Daily streak:** say hi at least once a day.
- **Rare variants** (`services/variants.ts`): same GIF alien, different tint/glow: Verdant Drifter, Ember Walker, Abyssal Echo, Prismatic One (mythic), plus time-of-day forms: **Dawnwatcher** (5–8 a.m. only) and **Lunar Grey** (midnight–4 a.m. only). Rare ones get their own chime and vibration. In WebXR the tint is applied to the billboard material.
- **Memory:** the alien greets returning players with hazy references to topics from recent chats.

## 🧪 Dev / test switches

- `?debug=1` shows the old state panel with *Force Spawn* / *Re-place*.
- `?nocamera=1` forces the no-camera star-room.
- `?variant=lunar` (or `verdant`, `ember`, `dawn`, `abyssal`, `prismatic`) forces a variant.

## ✨ Key Features

- **🎯 Discovery Gameplay**: Aliens randomly appear at screen edges - you have 5 seconds to respond!
- **💬 AI-Powered Conversations**: Each encounter features unique, cryptic conversations powered by Google Gemini AI
- **🎤 Voice Interaction**: Speak naturally to aliens using Web Speech API (optional)
- **⏱️ Time-Limited Encounters**: 90-second conversations create urgency and value
- **📚 Encounter Collection**: Review all past conversations with timestamps
- **🌈 Holographic Visuals**: Beautiful iridescent alien with cyan→purple→pink→orange gradients
- **📱 AR-Style Effects**: Device motion creates parallax depth illusion
- **🧠 Alien Memory**: The alien vaguely remembers past conversations


## 🌍 Grounded alien (AR vs camera fallback)

- **Android Chrome (ARCore / WebXR):** tap **Start AR (real floor)**, point at the floor until a ring appears, then **Place Alien Here**. The alien GIF is drawn on a camera-facing plane standing on that real floor point, with a soft contact shadow, and an invisible "corner" beside it so it leans out from behind something. three.js is only downloaded on these devices.
- **iPhone Safari / desktop:** the normal camera view is used. The alien stands on a fixed floor line near the bottom of the screen (with a contact shadow) and peeks in from the right edge of the screen.
- **Conversation:** the alien walks in and stops on a "presenting" gesture (frame 88 of `walk-gesture.gif`); the chat panel appears where it points and the GIF stays frozen while you chat. When you close the chat it waves goodbye and walks off.

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

- **React 18** + **TypeScript** - UI
- **Framer Motion** - Smooth animations and transitions
- **Google Gemini AI** - Powers alien conversation intelligence
- **Web Speech API** - Voice recognition & synthesis
- **MediaDevices API** - Camera access for AR background
- **Vite** - Lightning-fast build tool
- **Tailwind CSS 3** - compiled at build time (no CDN, so it works offline)
- **vite-plugin-pwa** - web manifest + Workbox service worker

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
```bash
vercel deploy          # preview
vercel deploy --prod   # production -> hi-im-an-alien.vercel.app
```

**AI is optional and sparse.** Without a key every reply is scripted (free, offline). With `GEMINI_API_KEY` set in the Vercel project (server-only; optional `GEMINI_MODEL`, default `gemini-3.5-flash-lite`), `api/alien.ts` answers *some* replies:

- greetings and farewells are always scripted; the first reply of each encounter is scripted
- after that each reply has a ~40% chance of going to Gemini (≈1 in 3 overall), max 3 AI replies per encounter and 15 per device per day (`alien_ai_daily` in localStorage)
- 4 s client timeout; any error, timeout, rate limit or offline → scripted reply
- server guards: persona prompt built server-side (clients can't send a system prompt), message ≤280 chars, ≤6 history turns, ≤110 output tokens, best-effort per-network (IPv4 /24, IPv6 /64) limit of 6/min and 20/hour per warm instance
- `?ai=1` forces AI for testing (still subject to the daily cap and server limits)

Never commit keys, and never use a `VITE_*` variable for a key (Vite compiles those into the public bundle).

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

The game works fully without any API key.

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
