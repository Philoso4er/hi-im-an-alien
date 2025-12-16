import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Play,
  HelpCircle,
  Volume2,
  VolumeX,
  X
} from 'lucide-react';

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

export default function App() {
  // ---------------- STATE ----------------
  const [screen, setScreen] = useState<GameScreen>(GameScreen.SPLASH);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
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

  // Alien
  const [alienVisible, setAlienVisible] = useState(false);
  const [alienStatus, setAlienStatus] = useState<AlienStatus>('IDLE');
  const [alienPosition, setAlienPosition] = useState<AlienPosition>({
    top: '50%',
    left: '50%'
  });

  // AR illusion (device motion)
  const [motionOffset, setMotionOffset] = useState({ x: 0, y: 0 });

  const [isGamePaused, setIsGamePaused] = useState(false);

  // Refs
  const gameLoopRef = useRef<number | null>(null);
  const alienTimeoutRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);

  // ---------------- EFFECTS ----------------

  // Splash → Menu
  useEffect(() => {
    if (screen === GameScreen.SPLASH) {
      const t = setTimeout(() => setScreen(GameScreen.MENU), 2000);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // Audio settings
  useEffect(() => {
    audioService.setSettings(settings.soundEnabled, settings.musicEnabled);
  }, [settings]);

  // 📱 Device-motion AR illusion
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;

      const maxOffset = 20;
      const x = Math.max(-maxOffset, Math.min(maxOffset, e.gamma));
      const y = Math.max(-maxOffset, Math.min(maxOffset, e.beta));

      setMotionOffset({
        x: x * 0.6,
        y: y * 0.6
      });
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () =>
      window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // ---------------- GAME LOGIC ----------------

  const spawnAlien = useCallback(() => {
    if (screen !== GameScreen.PLAYING) return;

    const top = `${Math.floor(Math.random() * 40) + 20}%`;
    const left = `${Math.floor(Math.random() * 60) + 20}%`;

    setAlienPosition({ top, left });
    setAlienStatus('IDLE');
    setAlienVisible(true);

    audioService.play('portal');
    setTimeout(() => audioService.play('spawn'), 300);

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
    setStreak(0);
    setStats({
      score: 0,
      successfulPings: 0,
      misses: 0,
      longestStreak: 0,
      averageReactionTimeMs: 0
    });

    setAlienVisible(false);
    setAlienStatus('IDLE');
    setIsGamePaused(false);

    audioService.init();
    audioService.play('click');

    // 🔎 Force first alien quickly for testing
    setTimeout(spawnAlien, 800);
  };

  const endGame = () => {
    setScreen(GameScreen.RESULTS);
    audioService.play('gameover');

    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    if (spawnTimeoutRef.current) clearTimeout(spawnTimeoutRef.current);

    setAlienVisible(false);
  };

  // Timer
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
  }, [screen, isGamePaused]);

  // ---------------- UI ----------------

  const renderSplash = () => (
    <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
      <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
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
        <button onClick={startGame} className="bg-cyan-600 py-4 rounded-xl font-bold text-xl">
          <Play /> PLAY
        </button>

        <button
          onClick={() => setScreen(GameScreen.HOW_TO)}
          className="bg-gray-800 py-3 rounded-xl font-bold"
        >
          <HelpCircle /> HOW TO PLAY
        </button>

        <button
          onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
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
            offsetX={motionOffset.x}
            offsetY={motionOffset.y}
          />

          <WaveButton onWave={() => setAlienStatus('HIT')} />

          <button onClick={endGame} className="absolute top-4 right-4 z-50 p-2">
            <X />
          </button>
        </>
      )}
    </div>
  );
}
