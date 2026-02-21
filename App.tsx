import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, BookOpen, Volume2, VolumeX, Settings as SettingsIcon } from 'lucide-react';

import {
  GameScreen,
  AlienStatus,
  AlienPosition,
  ConversationMessage,
  Settings
} from './types';

import CameraFeed from './components/CameraFeed';
import Alien from './components/Alien';
import SayHiButton from './components/SayHiButton';
import ConversationInterface from './components/ConversationInterface';
import EncounterCollection from './components/EncounterCollection';

import { audioService } from './services/audioService';
import { voiceService } from './services/voiceService';
import { storageService } from './services/storageService';
import { getAlienResponse, getAlienGreeting, getAlienFarewell } from './services/geminiService';

const ALIEN_MIN_INTERVAL = 3000;
const ALIEN_MAX_INTERVAL = 6000;
const ALIEN_VISIBLE_DURATION = 5000; // 5 seconds to say hi
const CONVERSATION_TIME_LIMIT = 90; // 90 seconds per conversation

export default function App() {
  // ---------------- STATE ----------------
  const [screen, setScreen] = useState<GameScreen>(GameScreen.SPLASH);
  const [alienVisible, setAlienVisible] = useState(false);
  const [alienStatus, setAlienStatus] = useState<AlienStatus>('IDLE');
  const [alienPosition, setAlienPosition] = useState<AlienPosition>({
    top: '50%',
    left: '50%',
    edge: 'bottom'
  });
  const [alienMessage, setAlienMessage] = useState<string | null>(null);
  
  // Conversation state
  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [conversationTimeLeft, setConversationTimeLeft] = useState(CONVERSATION_TIME_LIMIT);
  const [currentEncounterId, setCurrentEncounterId] = useState<string>('');
  const [encounterStartTime, setEncounterStartTime] = useState<number>(0);
  
  // Voice state
  const [isListening, setIsListening] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<Settings>({
    soundEnabled: true,
    voiceEnabled: voiceService.isSupported(),
    vibrationEnabled: true
  });

  // Device motion for AR illusion
  const [motionOffset, setMotionOffset] = useState({ x: 0, y: 0 });

  // Refs
  const alienTimeoutRef = useRef<number | null>(null);
  const spawnTimeoutRef = useRef<number | null>(null);
  const conversationTimerRef = useRef<number | null>(null);

  // ---------------- EFFECTS ----------------

  // Splash → Menu
  useEffect(() => {
    if (screen === GameScreen.SPLASH) {
      const t = setTimeout(() => setScreen(GameScreen.MENU), 2500);
      return () => clearTimeout(t);
    }
  }, [screen]);

  // Audio settings
  useEffect(() => {
    audioService.setSettings(settings.soundEnabled, settings.soundEnabled);
  }, [settings]);

  // Device motion AR illusion
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      const maxOffset = 20;
      const x = Math.max(-maxOffset, Math.min(maxOffset, e.gamma));
      const y = Math.max(-maxOffset, Math.min(maxOffset, e.beta));
      setMotionOffset({ x: x * 0.6, y: y * 0.6 });
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, []);

  // Conversation timer
  useEffect(() => {
    if (screen === GameScreen.CONVERSATION) {
      conversationTimerRef.current = window.setInterval(() => {
        setConversationTimeLeft(prev => {
          if (prev <= 1) {
            endConversation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (conversationTimerRef.current) {
        clearInterval(conversationTimerRef.current);
      }
    };
  }, [screen]);

  // ---------------- ALIEN SPAWNING ----------------

  const getRandomEdgePosition = (): AlienPosition => {
    const edges: Array<'top' | 'right' | 'bottom' | 'left'> = ['top', 'right', 'bottom', 'left'];
    const edge = edges[Math.floor(Math.random() * edges.length)];
    
    let top = '50%';
    let left = '50%';
    
    switch (edge) {
      case 'top':
        top = '15%';
        left = `${Math.floor(Math.random() * 60) + 20}%`;
        break;
      case 'bottom':
        top = '75%';
        left = `${Math.floor(Math.random() * 60) + 20}%`;
        break;
      case 'left':
        left = '15%';
        top = `${Math.floor(Math.random() * 60) + 20}%`;
        break;
      case 'right':
        left = '75%';
        top = `${Math.floor(Math.random() * 60) + 20}%`;
        break;
    }
    
    return { top, left, edge };
  };

  const spawnAlien = useCallback(() => {
    if (screen !== GameScreen.PLAYING) return;

    const position = getRandomEdgePosition();
    setAlienPosition(position);
    setAlienStatus('IDLE');
    setAlienVisible(true);

    audioService.play('portal');
    setTimeout(() => audioService.play('spawn'), 300);

    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    alienTimeoutRef.current = window.setTimeout(handleMiss, ALIEN_VISIBLE_DURATION);
  }, [screen]);

  const scheduleNextSpawn = useCallback(() => {
    const delay = Math.random() * (ALIEN_MAX_INTERVAL - ALIEN_MIN_INTERVAL) + ALIEN_MIN_INTERVAL;
    spawnTimeoutRef.current = window.setTimeout(spawnAlien, delay);
  }, [spawnAlien]);

  const handleMiss = () => {
    setAlienStatus('MISSED');
    audioService.play('miss');
    
    setTimeout(() => {
      setAlienVisible(false);
      scheduleNextSpawn();
    }, 800);
  };

  // ---------------- GAME ACTIONS ----------------

  const startExploring = () => {
    setScreen(GameScreen.PLAYING);
    audioService.init();
    audioService.play('click');
    
    // Quick first spawn
    setTimeout(spawnAlien, 1500);
  };

  const handleSayHi = async () => {
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    
    setAlienStatus('NOTICED');
    audioService.play('success');
    
    // Start conversation
    setTimeout(async () => {
      const encounterId = `encounter_${Date.now()}`;
      const startTime = Date.now();
      setCurrentEncounterId(encounterId);
      setEncounterStartTime(startTime);
      
      setScreen(GameScreen.CONVERSATION);
      setConversationTimeLeft(CONVERSATION_TIME_LIMIT);
      setConversationMessages([]);
      
      audioService.play('conversation_start');
      
      // Get alien greeting
      const stats = storageService.getStats();
      const timeOfDay = storageService.getTimeOfDay();
      const greeting = await getAlienGreeting({
        encounterCount: stats.encounterCount,
        previousTopics: [],
        timeOfDay,
        messageHistory: []
      });
      
      const greetingMessage: ConversationMessage = {
        role: 'alien',
        content: greeting,
        timestamp: Date.now()
      };
      
      setConversationMessages([greetingMessage]);
      setAlienStatus('TALKING');
      setAlienMessage(greeting);
      
      // Speak greeting if voice enabled
      if (settings.voiceEnabled) {
        voiceService.speak(greeting, 
          () => setAlienStatus('TALKING'),
          () => setAlienStatus('LISTENING')
        );
      }
      
      setTimeout(() => setAlienMessage(null), 4000);
    }, 1000);
  };

  const handleSendMessage = async (userText: string) => {
    const userMessage: ConversationMessage = {
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };
    
    setConversationMessages(prev => [...prev, userMessage]);
    setAlienStatus('THINKING');
    audioService.play('message');
    
    // Get AI response
    const stats = storageService.getStats();
    const timeOfDay = storageService.getTimeOfDay();
    
    const alienResponse = await getAlienResponse(userText, {
      encounterCount: stats.encounterCount,
      previousTopics: [],
      timeOfDay,
      messageHistory: conversationMessages.map(m => ({
        role: m.role === 'alien' ? 'alien' : 'user',
        content: m.content
      }))
    });
    
    const alienMessage: ConversationMessage = {
      role: 'alien',
      content: alienResponse,
      timestamp: Date.now()
    };
    
    setTimeout(() => {
      setConversationMessages(prev => [...prev, alienMessage]);
      setAlienStatus('TALKING');
      setAlienMessage(alienResponse);
      audioService.play('message');
      
      // Speak response if voice enabled
      if (settings.voiceEnabled) {
        voiceService.speak(alienResponse,
          () => setAlienStatus('TALKING'),
          () => setAlienStatus('LISTENING')
        );
      }
      
      setTimeout(() => setAlienMessage(null), 5000);
    }, 1500);
  };

  const handleStartVoice = () => {
    setIsListening(true);
    setAlienStatus('LISTENING');
    
    voiceService.startListening(
      (transcript) => {
        setIsListening(false);
        handleSendMessage(transcript);
      },
      (error) => {
        console.error('Voice error:', error);
        setIsListening(false);
        setAlienStatus('IDLE');
      }
    );
  };

  const handleStopVoice = () => {
    voiceService.stopListening();
    setIsListening(false);
    setAlienStatus('IDLE');
  };

  const endConversation = async () => {
    if (conversationTimerRef.current) clearInterval(conversationTimerRef.current);
    
    // Get farewell message
    const farewell = await getAlienFarewell({
      encounterCount: storageService.getStats().encounterCount,
      previousTopics: [],
      timeOfDay: storageService.getTimeOfDay(),
      messageHistory: []
    });
    
    setAlienMessage(farewell);
    setAlienStatus('IDLE');
    audioService.play('conversation_end');
    
    if (settings.voiceEnabled) {
      voiceService.speak(farewell);
    }
    
    // Save encounter
    const location = await storageService.getLocation();
    storageService.saveEncounter({
      id: currentEncounterId,
      startTime: encounterStartTime,
      endTime: Date.now(),
      messages: conversationMessages,
      location: location || undefined,
      timeOfDay: storageService.getTimeOfDay()
    });
    
    setTimeout(() => {
      setAlienVisible(false);
      setAlienMessage(null);
      setConversationMessages([]);
      setScreen(GameScreen.PLAYING);
      scheduleNextSpawn();
    }, 3000);
  };

  // ---------------- RENDER ----------------

  const renderSplash = () => (
    <div className="absolute inset-0 bg-black flex flex-col items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center"
      >
        <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-4">
          HI I'M AN ALIEN 👽
        </h1>
        <motion.p
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-cyan-400 text-center mt-4 uppercase text-sm tracking-wider"
        >
          Scanning for life forms...
        </motion.p>
      </motion.div>
    </div>
  );

  const renderMenu = () => (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black/70 backdrop-blur-md">
      <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-3 text-center">
        HI I'M AN ALIEN 👽
      </h1>
      <p className="text-gray-300 text-center mb-8 max-w-md">
        Mysterious beings appear in your world. Say hi before they vanish, then chat with them!
      </p>

      <div className="flex flex-col w-full max-w-sm gap-3">
        <button
          onClick={startExploring}
          className="bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/50"
        >
          <Play className="w-5 h-5" /> START EXPLORING
        </button>

        <button
          onClick={() => setScreen(GameScreen.COLLECTION)}
          className="bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <BookOpen className="w-5 h-5" /> 
          PAST ENCOUNTERS ({storageService.getEncounters().length})
        </button>

        <button
          onClick={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
          className="bg-gray-800 hover:bg-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          {settings.soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          SOUND {settings.soundEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <p className="text-gray-500 text-xs mt-8 text-center max-w-md">
        Each alien appears for 5 seconds. Say hi to start a 90-second conversation.
      </p>
    </div>
  );

  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden">
      <CameraFeed />

      {screen === GameScreen.SPLASH && renderSplash()}
      {screen === GameScreen.MENU && renderMenu()}

      {screen === GameScreen.PLAYING && (
        <>
          <Alien
            isVisible={alienVisible}
            status={alienStatus}
            position={alienPosition}
            offsetX={motionOffset.x}
            offsetY={motionOffset.y}
            message={alienMessage}
          />

          {alienVisible && alienStatus !== 'MISSED' && (
            <SayHiButton
              onSayHi={handleSayHi}
              timeLeft={Math.ceil((alienTimeoutRef.current ? 
                (ALIEN_VISIBLE_DURATION - (Date.now() - (Date.now() - ALIEN_VISIBLE_DURATION))) / 1000 : 5))}
            />
          )}
        </>
      )}

      {screen === GameScreen.CONVERSATION && (
        <>
          <Alien
            isVisible={true}
            status={alienStatus}
            position={alienPosition}
            offsetX={motionOffset.x}
            offsetY={motionOffset.y}
            message={alienMessage}
          />

          <ConversationInterface
            messages={conversationMessages}
            timeLeft={conversationTimeLeft}
            isVoiceEnabled={settings.voiceEnabled}
            isListening={isListening}
            onSendMessage={handleSendMessage}
            onStartVoice={handleStartVoice}
            onStopVoice={handleStopVoice}
            onEndConversation={endConversation}
          />
        </>
      )}

      {screen === GameScreen.COLLECTION && (
        <EncounterCollection
          encounters={storageService.getEncounters()}
          onClose={() => setScreen(GameScreen.MENU)}
        />
      )}
    </div>
  );
}
