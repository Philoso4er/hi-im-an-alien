// App.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  HelpCircle,
  Volume2,
  VolumeX,
  RotateCcw,
  Home,
  X,
  Send
} from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import {
  GameScreen,
  GameStats,
  Settings,
  AlienPosition,
  AlienStatus
} from './types';
import CameraFeed from './components/CameraFeed';
import Alien from './components/Alien';
import GameHUD from './components/GameHUD';
import WaveButton from './components/WaveButton';
import { audioService } from './services/audioService';

const GAME_DURATION = 60;
const ALIEN_MIN_INTERVAL = 2000;
const ALIEN_MAX_INTERVAL = 5000;
const ALIEN_VISIBLE_DURATION = 4000;

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export default function App() {
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

  const [alienVisible, setAlienVisible] = useState(false);
  const [alienStatus, setAlienStatus] = useState<AlienStatus>('IDLE');
  const [alienPosition, setAlienPosition] = useState<AlienPosition>({
    top: '50%',
    left: '50%'
  });
  const [alienMessage, setAlienMessage] = useState<string | null>(null);

  const [chatInput, setChatInput] = useState('');
  const [isGamePaused, setIsGamePaused] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; color: string } | null>(null);

  const gameLoopRef = useRef<number | null>(null);
  const alienTimeoutRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const patienceTimeoutRef = useRef<number | null>(null);
  const reactionStartRef = useRef<number>(0);
  const reactionTimesRef = useRef<number[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (screen === GameScreen.SPLASH) {
      setTimeout(() => setScreen(GameScreen.MENU), 2000);
    }
  }, [screen]);

  useEffect(() => {
    audioService.setSettings(settings.soundEnabled, settings.musicEnabled);
  }, [settings]);

  const spawnAlien = useCallback(() => {
    if (screen !== GameScreen.PLAYING) return;

    const top = `${Math.floor(Math.random() * 40) + 20}%`;
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

    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    alienTimeoutRef.current = window.setTimeout(handleMiss, ALIEN_VISIBLE_DURATION);
  }, [screen]);

  const scheduleNextSpawn = useCallback(() => {
    const delay =
      Math.random() * (ALIEN_MAX_INTERVAL - ALIEN_MIN_INTERVAL) +
      ALIEN_MIN_INTERVAL;
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

    const total = reactionTimesRef.current.reduce((a, b) => a + b, 0);
    const avg = reactionTimesRef.current.length
      ? Math.round(total / reactionTimesRef.current.length)
      : 0;

    setStats(prev => ({ ...prev, averageReactionTimeMs: avg }));
  }, []);

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
  }, [screen, isGamePaused, endGame]);

  /* UI RENDERING */

  const renderSplash = () => (
    <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
      >
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
          HI I’M AN ALIEN 👽
        </h1>
        <p className="text-cyan-600 text-center mt-2 uppercase text-xs">
          Scanning human environment…
        </p>
      </motion.div>
    </div>
  );

  const renderMenu = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <h1 className="text-6xl font-black text-cyan-400 mb-8 text-center">
        HI I’M AN ALIEN 👽
      </h1>

      <div className="flex flex-col w-full max-w-xs gap-4">
        <button
          onClick={startGame}
          className="bg-gradient-to-r from-cyan-600 to-blue-600 py-4 rounded-xl font-bold text-xl"
        >
          <Play /> PLAY
        </button>

        <button
          onClick={() => setScreen(GameScreen.HOW_TO)}
          className="bg-gray-800 py-3 rounded-xl font-bold"
        >
          <HelpCircle /> HOW TO PLAY
        </button>

        <button
          onClick={() =>
            setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))
          }
          className="bg-gray-800 py-3 rounded-xl font-bold"
        >
          {settings.soundEnabled ? <Volume2 /> : <VolumeX />} SOUND
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden">
      <CameraFeed />
      {screen === GameScreen.SPLASH && renderSplash()}
      {screen === GameScreen.MENU && renderMenu()}
      {screen === GameScreen.PLAYING && (
        <>
          <GameHUD stats={stats} timeLeft={timeLeft} streak={streak} />
          <Alien
            isVisible={alienVisible}
            status={alienStatus}
            position={alienPosition}
            message={alienMessage}
          />
          <WaveButton onWave={() => {}} />
          <button
            onClick={endGame}
            className="absolute top-4 right-4 z-50 p-2"
          >
            <X />
          </button>
        </>
      )}
    </div>
  );
}
