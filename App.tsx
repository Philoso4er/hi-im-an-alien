import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Settings as SettingsIcon, HelpCircle, Volume2, VolumeX, RotateCcw, Home, X, Send, MessageCircle } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { GameScreen, GameStats, Settings, AlienPosition, AlienStatus } from './types';
import CameraFeed from './components/CameraFeed';
import Alien from './components/Alien';
import GameHUD from './components/GameHUD';
import WaveButton from './components/WaveButton';
import { audioService } from './services/audioService';

const GAME_DURATION = 60; // Seconds
const ALIEN_MIN_INTERVAL = 2000;
const ALIEN_MAX_INTERVAL = 5000;
const ALIEN_VISIBLE_DURATION = 4000; 

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default function App() {
  // --- State ---
  const [screen, setScreen] = useState<GameScreen>(GameScreen.SPLASH);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    successfulPings: 0,
    misses: 0,
    longestStreak: 0,
    averageReactionTimeMs: 0
  });
  
  const [settings, setSettings] = useState<Settings>({
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true
  });

  // Alien State
  const [alienVisible, setAlienVisible] = useState(false);
  const [alienStatus, setAlienStatus] = useState<AlienStatus>('IDLE');
  const [alienPosition, setAlienPosition] = useState<AlienPosition>({ top: '50%', left: '50%' });
  const [alienMessage, setAlienMessage] = useState<string | null>(null);
  
  // Chat State
  const [chatInput, setChatInput] = useState('');
  const [isGamePaused, setIsGamePaused] = useState(false);
  
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);

  // --- Refs ---
  const gameLoopRef = useRef<number | null>(null);
  const alienTimeoutRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const patienceTimeoutRef = useRef<number | null>(null);
  const reactionStartRef = useRef<number>(0);
  const reactionTimesRef = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- Lifecycle & Init ---
  useEffect(() => {
    if (screen === GameScreen.SPLASH) {
      setTimeout(() => setScreen(GameScreen.MENU), 2000);
    }
  }, [screen]);

  useEffect(() => {
    audioService.setSettings(settings.soundEnabled, settings.musicEnabled);
  }, [settings]);

  // --- Game Loop Logic ---
  
  const spawnAlien = useCallback(() => {
    if (screen !== GameScreen.PLAYING) return;

    // Calculate position
    const top = `${Math.floor(Math.random() * 40) + 20}%`; // Keep somewhat central
    const left = `${Math.floor(Math.random() * 60) + 20}%`;

    setAlienPosition({ top, left });
    setAlienStatus('IDLE');
    setAlienMessage(null);
    setAlienVisible(true);
    setChatInput('');
    setIsGamePaused(false);
    
    audioService.play('portal');
    setTimeout(() => audioService.play('spawn'), 300);
    
    reactionStartRef.current = Date.now();

    // Miss timer
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    alienTimeoutRef.current = window.setTimeout(() => {
      handleMiss();
    }, ALIEN_VISIBLE_DURATION);
  }, [screen]);

  const scheduleNextSpawn = useCallback(() => {
    const delay = Math.floor(Math.random() * (ALIEN_MAX_INTERVAL - ALIEN_MIN_INTERVAL) + ALIEN_MIN_INTERVAL);
    spawnTimeoutRef.current = window.setTimeout(spawnAlien, delay);
  }, [spawnAlien]);

  const handleMiss = () => {
    setAlienStatus(prev => {
        if (prev !== 'IDLE') return prev; 
        
        audioService.play('miss');
        setStreak(0);
        setStats(s => ({ ...s, misses: s.misses + 1 }));
        setFeedback({ text: "Too Slow!", color: "text-red-500" });
        setTimeout(() => setFeedback(null), 1000);

        setTimeout(() => {
            setAlienVisible(false);
            scheduleNextSpawn();
        }, 600);
        
        return 'MISSED';
    });
  };

  const startGame = () => {
    setScreen(GameScreen.PLAYING);
    setTimeLeft(GAME_DURATION);
    setScore(0);
    setStreak(0);
    setStats({
      score: 0,
      successfulPings: 0,
      misses: 0,
      longestStreak: 0,
      averageReactionTimeMs: 0
    });
    reactionTimesRef.current = [];
    setFeedback(null);
    setAlienVisible(false);
    setIsGamePaused(false);
    setAlienStatus('IDLE');
    setAlienMessage(null);

    audioService.init();
    audioService.play('click');
    
    scheduleNextSpawn();
  };

  const endGame = useCallback(() => {
    setScreen(GameScreen.RESULTS);
    audioService.play('gameover');
    
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);
    if (patienceTimeoutRef.current) clearTimeout(patienceTimeoutRef.current);
    
    setAlienVisible(false);
    setAlienMessage(null);

    const totalReactionTime = reactionTimesRef.current.reduce((a, b) => a + b, 0);
    const avg = reactionTimesRef.current.length > 0 ? Math.round(totalReactionTime / reactionTimesRef.current.length) : 0;
    
    setStats(prev => ({ ...prev, averageReactionTimeMs: avg }));
  }, []);

  // Timer Effect
  useEffect(() => {
    if (screen === GameScreen.PLAYING && !isGamePaused) {
      gameLoopRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [screen, endGame, isGamePaused]);


  const handleWave = () => {
    audioService.play('click');
    
    if (!alienVisible || alienStatus !== 'IDLE') return;

    // Clear Miss Timer
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);

    // Initial Hit Animation
    setAlienStatus('HIT');

    // Stats
    const reactionTime = Date.now() - reactionStartRef.current;
    reactionTimesRef.current.push(reactionTime);

    const basePoints = 100;
    const timeBonus = Math.max(0, 500 - reactionTime);
    const streakBonus = streak * 50;
    const points = Math.floor((basePoints + timeBonus + streakBonus) / 10) * 10;

    const newStreak = streak + 1;
    setStreak(newStreak);
    setScore(prev => prev + points);
    setStats(prev => ({
      ...prev,
      score: prev.score + points,
      successfulPings: prev.successfulPings + 1,
      longestStreak: Math.max(prev.longestStreak, newStreak)
    }));

    audioService.play('success');
    if (settings.vibrationEnabled && navigator.vibrate) navigator.vibrate(50);
    
    setFeedback({ text: `+${points}`, color: "text-green-400" });
    setTimeout(() => setFeedback(null), 800);

    // Transition to Chat Mode instead of leaving immediately
    setTimeout(() => {
        setAlienStatus('LISTENING');
        setIsGamePaused(true); // Pause timer during chat
        // Auto-focus input after a moment
        setTimeout(() => inputRef.current?.focus(), 100);

        // Patience Timer: Alien leaves if ignored for too long
        patienceTimeoutRef.current = window.setTimeout(() => {
             handleAlienDeparture();
        }, 8000); // 8 seconds to start typing
    }, 800);
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;
      if (patienceTimeoutRef.current) clearTimeout(patienceTimeoutRef.current);

      const userQuestion = chatInput;
      setChatInput('');
      setAlienStatus('THINKING');

      try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `You are an alien traveler passing through dimensions. A human just waved at you. 
            The human says: "${userQuestion}". 
            Reply in a mysterious, blunt, short (max 10 words) manner. 
            Do not ask questions. You are aloof but curious. 
            Keep it sci-fi/cryptic.`,
        });

        const text = response.text || "...";
        
        setAlienStatus('TALKING');
        setAlienMessage(text);
        audioService.play('click'); // Or a talk sound if added

        // Leave after reading time
        const readingTime = Math.max(2000, text.length * 100);
        setTimeout(() => {
            handleAlienDeparture();
        }, readingTime);

      } catch (err) {
          console.error("GenAI Error", err);
          setAlienMessage("...static...");
          setTimeout(handleAlienDeparture, 2000);
      }
  };

  const handleAlienDeparture = () => {
      setAlienMessage(null);
      setAlienStatus('HIT'); // Waving goodbye briefly
      setIsGamePaused(false);
      
      setTimeout(() => {
          setAlienVisible(false);
          scheduleNextSpawn();
      }, 500);
  };

  // --- Render Helpers ---

  const renderSplash = () => (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 tracking-tighter">
          ALIEN PING
        </h1>
        <p className="text-cyan-700 text-center mt-2 tracking-widest uppercase text-xs">Initializing AR Interface...</p>
      </motion.div>
    </div>
  );

  const renderMenu = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <h1 className="text-6xl font-black text-cyan-400 mb-8 drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] text-center">
        ALIEN<br/>PING
      </h1>

      <div className="flex flex-col w-full max-w-xs gap-4">
        <button
          onClick={startGame}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-4 rounded-xl font-bold text-xl shadow-lg border border-cyan-400/30 transition-transform active:scale-95"
        >
          <Play fill="currentColor" /> PLAY ARCADE
        </button>

        <button
          onClick={() => { audioService.play('click'); setScreen(GameScreen.HOW_TO); }}
          className="flex items-center justify-center gap-2 bg-gray-800/80 hover:bg-gray-700 py-3 rounded-xl font-bold text-lg border border-gray-600 transition-transform active:scale-95"
        >
          <HelpCircle /> HOW TO PLAY
        </button>

        <button
          onClick={() => { 
             audioService.play('click');
             setSettings(s => ({...s, soundEnabled: !s.soundEnabled}));
          }}
          className="flex items-center justify-center gap-2 bg-gray-800/80 hover:bg-gray-700 py-3 rounded-xl font-bold text-lg border border-gray-600 transition-transform active:scale-95"
        >
          {settings.soundEnabled ? <Volume2 /> : <VolumeX />} SOUND: {settings.soundEnabled ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden select-none font-sans">
      <CameraFeed />

      {screen === GameScreen.PLAYING && (
        <>
          <GameHUD stats={stats} timeLeft={timeLeft} streak={streak} />
          
          <Alien 
            isVisible={alienVisible} 
            status={alienStatus}
            position={alienPosition}
            message={alienMessage}
          />
          
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 0 }}
                animate={{ opacity: 1, scale: 1.5, y: -50 }}
                exit={{ opacity: 0 }}
                className={`absolute top-1/2 left-0 right-0 text-center font-black text-4xl drop-shadow-md z-30 pointer-events-none ${feedback.color}`}
              >
                {feedback.text}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
             onClick={() => { audioService.play('click'); endGame(); }}
             className="absolute top-4 right-4 z-50 p-2 bg-black/40 rounded-full text-white/50 hover:text-white"
          >
             <X size={20} />
          </button>

          {/* Interaction Area */}
          <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50 px-6">
             <AnimatePresence mode="wait">
                {(alienStatus === 'LISTENING' || alienStatus === 'THINKING' || alienStatus === 'TALKING') ? (
                   <motion.form 
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: 20 }}
                     onSubmit={handleChatSubmit}
                     className="w-full max-w-sm flex gap-2"
                   >
                      <input 
                        ref={inputRef}
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Ask the alien..."
                        disabled={alienStatus !== 'LISTENING'}
                        className="flex-1 bg-black/70 backdrop-blur-md border border-cyan-500/50 rounded-xl px-4 py-3 text-white placeholder-cyan-700 focus:outline-none focus:border-cyan-400"
                      />
                      <button 
                        type="submit"
                        disabled={alienStatus !== 'LISTENING' || !chatInput.trim()}
                        className="bg-cyan-600 disabled:opacity-50 disabled:bg-gray-700 text-white p-3 rounded-xl"
                      >
                         <Send size={24} />
                      </button>
                   </motion.form>
                ) : (
                    <WaveButton onWave={handleWave} disabled={alienStatus !== 'IDLE'} />
                )}
             </AnimatePresence>
          </div>
        </>
      )}

      {screen === GameScreen.SPLASH && renderSplash()}
      {screen === GameScreen.MENU && renderMenu()}
      {screen === GameScreen.HOW_TO && (
        <div className="absolute inset-0 z-50 bg-gray-900 p-8 flex flex-col items-center text-center overflow-y-auto">
          <h2 className="text-3xl font-bold text-cyan-400 mb-6">MISSION BRIEF</h2>
          <div className="space-y-6 text-gray-300 max-w-md">
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <p className="font-bold text-white mb-2">1. WAVE</p>
              <p>When an alien appears, tap WAVE BACK quickly for points.</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <p className="font-bold text-white mb-2">2. TALK</p>
              <p>After waving, the alien will pause. Type a quick question to interact!</p>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <p className="font-bold text-white mb-2">3. REPEAT</p>
              <p>The alien will leave after answering. Find the next one.</p>
            </div>
          </div>
          <button
              onClick={() => { audioService.play('click'); setScreen(GameScreen.MENU); }}
              className="mt-8 bg-cyan-600 px-8 py-3 rounded-full font-bold text-white"
            >
              UNDERSTOOD
            </button>
        </div>
      )}
      {screen === GameScreen.RESULTS && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <h2 className="text-4xl font-black text-white mb-2">SESSION ENDED</h2>
          <div className="text-6xl font-mono font-bold text-yellow-400 mb-8 drop-shadow-lg">
            {stats.score.toLocaleString()}
          </div>
          <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
            <div className="bg-gray-800/80 p-3 rounded-lg text-center border border-gray-700">
              <p className="text-xs text-gray-400 uppercase">Pings</p>
              <p className="text-xl font-bold text-green-400">{stats.successfulPings}</p>
            </div>
            <div className="bg-gray-800/80 p-3 rounded-lg text-center border border-gray-700">
              <p className="text-xs text-gray-400 uppercase">Streak</p>
              <p className="text-xl font-bold text-purple-400">{stats.longestStreak}</p>
            </div>
          </div>
          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={() => { audioService.play('click'); setScreen(GameScreen.MENU); }}
              className="flex-1 bg-gray-700 hover:bg-gray-600 py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1"
            >
              <Home className="w-5 h-5" /> MENU
            </button>
            <button
              onClick={startGame}
              className="flex-[2] bg-cyan-600 hover:bg-cyan-500 py-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-cyan-900/50"
            >
              <RotateCcw className="w-5 h-5" /> PLAY AGAIN
            </button>
          </div>
        </div>
      )}
    </div>
  );
}