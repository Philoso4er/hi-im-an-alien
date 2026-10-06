import React, { useState, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, BookOpen, Volume2, VolumeX, TestTube2 } from 'lucide-react';

import {
  GameScreen,
  AlienStatus,
  ConversationMessage,
  Settings
} from './types';

import CameraFeed from './components/CameraFeed';
import Alien from './components/Alien';
import SayHiButton from './components/SayHiButton';
import ConversationInterface from './components/ConversationInterface';
import EncounterCollection from './components/EncounterCollection';
import ARTest from './components/ARTest';
import ARCalibration from './components/ARCalibration';
import {
  computeStageLayout,
  computeXRChatRect,
  ConversationPhase,
  useViewport
} from './components/alienStage';
import type { XRStageHandle, XRScreenAnchor } from './components/XRAlienStage';
import { GifPlayer } from './services/gifPlayer';
import { isImmersiveARSupported, requestARSession } from './services/xrService';

import { audioService } from './services/audioService';
import { voiceService } from './services/voiceService';
import { storageService } from './services/storageService';
import { getAlienResponse, getAlienGreeting, getAlienFarewell } from './services/geminiService';

// three.js is only downloaded on devices that actually support WebXR AR.
const XRAlienStage = lazy(() => import('./components/XRAlienStage'));

const ALIEN_VISIBLE_DURATION = 5000;
const CONVERSATION_TIME_LIMIT = 90;

interface OrientationSample {
  alpha: number;
  beta: number;
  gamma: number;
}

export default function App() {
  const [screen, setScreen] = useState<GameScreen>(GameScreen.SPLASH);
  const [alienVisible, setAlienVisible] = useState(false);
  const [alienStatus, setAlienStatus] = useState<AlienStatus>('IDLE');
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>('none');
  const [spawnDeadline, setSpawnDeadline] = useState(0);
  const [alienMessage, setAlienMessage] = useState<string | null>(null);

  const [showARTest, setShowARTest] = useState(false);

  const [motionSupported] = useState<boolean>(
    () => typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  );
  const [motionPermissionGranted, setMotionPermissionGranted] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [anchor, setAnchor] = useState<OrientationSample | null>(null);
  const [liveOrientation, setLiveOrientation] = useState<OrientationSample>({
    alpha: 0,
    beta: 0,
    gamma: 0
  });
  const [motionOffset, setMotionOffset] = useState({ x: 0, y: 0 });
  const [arOpacity, setArOpacity] = useState(1);

  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [conversationTimeLeft, setConversationTimeLeft] = useState(CONVERSATION_TIME_LIMIT);
  const [currentEncounterId, setCurrentEncounterId] = useState<string>('');
  const [encounterStartTime, setEncounterStartTime] = useState<number>(0);

  const [isListening, setIsListening] = useState(false);

  const [settings, setSettings] = useState<Settings>({
    soundEnabled: true,
    musicEnabled: false,
    voiceEnabled: voiceService.isSupported(),
    vibrationEnabled: true
  });

  const alienTimeoutRef = useRef<number | null>(null);
  const conversationTimerRef = useRef<number | null>(null);
  const phaseSafetyRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const messagesRef = useRef<ConversationMessage[]>([]);
  messagesRef.current = conversationMessages;

  // One GIF player for the whole game: drawn in the DOM (fallback) or as a WebXR texture.
  const alienPlayer = useMemo(() => new GifPlayer(), []);
  const viewport = useViewport();
  const layout = useMemo(
    () => computeStageLayout(viewport.vw, viewport.vh, viewport.visualH),
    [viewport]
  );

  // ---- WebXR (real floor anchoring) ----
  const rootRef = useRef<HTMLDivElement>(null);
  const xrStageRef = useRef<XRStageHandle>(null);
  const [xrSupported, setXrSupported] = useState(false);
  const [xrSession, setXrSession] = useState<XRSession | null>(null);
  const [xrHasFloor, setXrHasFloor] = useState(false);
  const [xrAnchor, setXrAnchor] = useState<XRScreenAnchor | null>(null);
  const [xrError, setXrError] = useState<string | null>(null);

  useEffect(() => {
    isImmersiveARSupported().then(setXrSupported);
  }, []);

  useEffect(() => {
    if (screen === GameScreen.SPLASH) {
      const t = setTimeout(() => setScreen(GameScreen.MENU), 2500);
      return () => clearTimeout(t);
    }
  }, [screen]);

  useEffect(() => {
    audioService.setSettings(settings.soundEnabled, settings.soundEnabled);
  }, [settings]);

  useEffect(() => {
    if (!motionPermissionGranted) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      setLiveOrientation({
        alpha: e.alpha ?? 0,
        beta: e.beta,
        gamma: e.gamma
      });
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [motionPermissionGranted]);

  useEffect(() => {
    if (!anchor) {
      setMotionOffset({ x: 0, y: 0 });
      setArOpacity(1);
      return;
    }

    const angleDiff = (a: number, b: number) => {
      let diff = a - b;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      return diff;
    };

    const deltaAlpha = angleDiff(liveOrientation.alpha, anchor.alpha);
    const deltaBeta = liveOrientation.beta - anchor.beta;

    const sensitivityX = 7;
    const sensitivityY = 5;
    const maxOffset = 260;

    const rawX = -deltaAlpha * sensitivityX;
    const rawY = deltaBeta * sensitivityY;

    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, rawX));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, rawY));

    setMotionOffset({ x: clampedX, y: clampedY });

    const distanceFactor = Math.max(Math.abs(clampedX), Math.abs(clampedY)) / maxOffset;
    setArOpacity(Math.max(0.15, 1 - distanceFactor * 0.9));
  }, [liveOrientation, anchor]);

  useEffect(() => {
    if (screen === GameScreen.CONVERSATION) {
      conversationTimerRef.current = window.setInterval(() => {
        setConversationTimeLeft(prev => {
          if (prev <= 1) {
            endConversationRef.current();
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

  const requestMotionPermission = async (): Promise<boolean> => {
    const DOE = (window as any).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        const response = await DOE.requestPermission();
        return response === 'granted';
      } catch (err) {
        console.error('Motion permission error:', err);
        return false;
      }
    }
    return motionSupported;
  };

  // Spawns the alien. In the camera fallback it stands on a fixed floor line and
  // peeks in from the right edge of the screen; in WebXR it stands on the floor
  // point that was under the reticle.
  const spawnAlienAtCrosshair = () => {
    setAlienMessage(null);
    setConversationPhase('none');
    setAlienStatus('IDLE');
    setSpawnDeadline(Date.now() + ALIEN_VISIBLE_DURATION);
    setAlienVisible(true);

    audioService.play('spawn');

    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    alienTimeoutRef.current = window.setTimeout(handleMiss, ALIEN_VISIBLE_DURATION);
  };

  const handleMiss = () => {
    setAlienStatus('MISSED');
    audioService.play('miss');

    setTimeout(() => {
      setAlienVisible(false);
      // Require re-placement for the next alien — this is what creates the
      // "search for it" feel without GPS: you decide where it shows up next
      // by where you point and tap.
      setPlaced(false);
      setAnchor(null);
    }, 800);
  };

  const startExploring = async () => {
    audioService.init();
    audioService.play('click');

    const granted = await requestMotionPermission();
    setMotionPermissionGranted(granted);

    setPlaced(false);
    setAnchor(null);
    setScreen(GameScreen.PLAYING);
  };

  const startXR = () => {
    const root = rootRef.current;
    if (!root) return;
    audioService.init();
    setXrError(null);
    // requestSession must run synchronously inside the tap handler.
    requestARSession(root)
      .then(session => {
        session.addEventListener('end', () => {
          setXrSession(null);
          setXrHasFloor(false);
          setXrAnchor(null);
          setPlaced(false);
          setAnchor(null);
        });
        setPlaced(false);
        setAnchor(null);
        setXrSession(session);
      })
      .catch(err => {
        console.error('Could not start AR:', err);
        setXrError('AR could not start on this device — using the camera view instead.');
      });
  };

  const handlePlaceAlien = () => {
    if (xrSession) {
      // Anchor to the real floor point under the reticle.
      if (!xrStageRef.current?.place()) return;
    }
    setAnchor({ ...liveOrientation });
    setPlaced(true);
    audioService.play('portal');
    setTimeout(spawnAlienAtCrosshair, 800);
  };

  const forceSpawn = () => {
    spawnAlienAtCrosshair();
  };

  const handleSayHi = async () => {
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);

    setAlienStatus('NOTICED');
    audioService.play('success');

    setTimeout(async () => {
      const encounterId = `encounter_${Date.now()}`;
      const startTime = Date.now();
      setCurrentEncounterId(encounterId);
      setEncounterStartTime(startTime);

      endingRef.current = false;
      setAlienMessage(null);
      setScreen(GameScreen.CONVERSATION);
      // Walk in, stop on the presenting gesture; the chat appears where it points.
      setConversationPhase('walk-in');
      setConversationTimeLeft(CONVERSATION_TIME_LIMIT);
      setConversationMessages([]);
      if (phaseSafetyRef.current) clearTimeout(phaseSafetyRef.current);
      phaseSafetyRef.current = window.setTimeout(handleWalkInDone, 9000);

      audioService.play('conversation_start');

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

      if (endingRef.current) return;
      setConversationMessages([greetingMessage]);
      setAlienStatus('TALKING');

      if (settings.voiceEnabled) {
        voiceService.speak(greeting,
          () => setAlienStatus('TALKING'),
          () => setAlienStatus('LISTENING')
        );
      }
    }, 1000);
  };

  const handleWalkInDone = () => {
    if (phaseSafetyRef.current) clearTimeout(phaseSafetyRef.current);
    setConversationPhase(p => (p === 'walk-in' ? 'hold' : p));
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
      if (endingRef.current) return;
      setConversationMessages(prev => [...prev, alienMessage]);
      setAlienStatus('TALKING');
      audioService.play('message');

      if (settings.voiceEnabled) {
        voiceService.speak(alienResponse,
          () => setAlienStatus('TALKING'),
          () => setAlienStatus('LISTENING')
        );
      }
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
    if (endingRef.current) return;
    endingRef.current = true;
    if (conversationTimerRef.current) clearInterval(conversationTimerRef.current);
    if (phaseSafetyRef.current) clearTimeout(phaseSafetyRef.current);
    voiceService.stopListening();
    setIsListening(false);

    // Close the chat and let the GIF play on: wave goodbye, then walk out.
    setConversationPhase('walk-out');
    setAlienStatus('IDLE');
    audioService.play('conversation_end');
    phaseSafetyRef.current = window.setTimeout(finishConversation, 12000);

    const messages = messagesRef.current;
    const farewell = await getAlienFarewell({
      encounterCount: storageService.getStats().encounterCount,
      previousTopics: [],
      timeOfDay: storageService.getTimeOfDay(),
      messageHistory: []
    });

    if (endingRef.current) {
      setAlienMessage(farewell);
      if (settings.voiceEnabled) {
        voiceService.speak(farewell);
      }
    }

    const location = await storageService.getLocation();
    storageService.saveEncounter({
      id: currentEncounterId,
      startTime: encounterStartTime,
      endTime: Date.now(),
      messages,
      location: location || undefined,
      timeOfDay: storageService.getTimeOfDay()
    });
  };
  const endConversationRef = useRef(endConversation);
  endConversationRef.current = endConversation;

  const finishConversation = () => {
    if (!endingRef.current) return;
    endingRef.current = false;
    if (phaseSafetyRef.current) clearTimeout(phaseSafetyRef.current);
    setAlienVisible(false);
    setAlienMessage(null);
    setConversationMessages([]);
    setConversationPhase('none');
    setScreen(GameScreen.PLAYING);
    setPlaced(false);
    setAnchor(null);
  };

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
          onClick={() => setShowARTest(true)}
          className="bg-purple-800 hover:bg-purple-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <TestTube2 className="w-5 h-5" />
          TRUE 3D PLACEMENT (ARCORE/ARKIT ONLY)
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
        Point your camera somewhere and place your alien. Say hi within 5 seconds before it vanishes.
      </p>
    </div>
  );

  const inConversation = screen === GameScreen.CONVERSATION;
  const alienLayerActive = (screen === GameScreen.PLAYING && placed) || inConversation;
  const chatRect = xrSession ? computeXRChatRect(layout, xrAnchor) : layout.chat;

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-dvh overflow-hidden ${xrSession ? 'bg-transparent' : 'bg-black'}`}
    >
      {/* In WebXR the browser shows the camera itself; don't fight it for the camera. */}
      {!xrSession && <CameraFeed />}

      {xrSession && (
        <Suspense fallback={null}>
          <XRAlienStage
            ref={xrStageRef}
            session={xrSession}
            player={alienPlayer}
            isVisible={inConversation || alienVisible}
            status={alienStatus}
            scene={inConversation ? 'conversation' : 'peek'}
            placed={placed}
            onReticleChange={setXrHasFloor}
            onScreenAnchor={setXrAnchor}
          />
        </Suspense>
      )}

      {screen === GameScreen.SPLASH && renderSplash()}
      {screen === GameScreen.MENU && renderMenu()}

      {alienLayerActive && (
        <div style={{ opacity: screen === GameScreen.PLAYING && !xrSession ? arOpacity : 1, transition: 'opacity 0.15s linear' }}>
          <Alien
            player={alienPlayer}
            isVisible={inConversation || alienVisible}
            status={alienStatus}
            scene={inConversation ? 'conversation' : 'peek'}
            phase={conversationPhase}
            layout={layout}
            renderTarget={xrSession ? 'xr' : 'dom'}
            message={alienMessage}
            xrBubbleAnchor={xrAnchor ? { x: xrAnchor.headX, y: xrAnchor.headY } : null}
            onWalkInDone={handleWalkInDone}
            onWalkOutDone={finishConversation}
          />
        </div>
      )}

      {screen === GameScreen.PLAYING && (
        <>
          {!placed && (
            <ARCalibration
              onPlace={handlePlaceAlien}
              motionSupported={motionSupported}
              xrSupported={xrSupported}
              xrActive={!!xrSession}
              xrHasFloor={xrHasFloor}
              xrError={xrError}
              onStartXR={startXR}
            />
          )}

          {placed && (
            <>
              <div className="absolute top-4 left-4 z-50 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-mono">
                <div className="text-cyan-400">State: PLAYING</div>
                <div className="text-white">Alien: {alienVisible ? 'VISIBLE' : 'HIDDEN'}</div>
                <div className="text-white">Status: {alienStatus}</div>
                <div className="text-white">Mode: {xrSession ? 'WebXR floor' : 'Camera fallback'}</div>
                <div className="text-white">Motion: {motionPermissionGranted ? 'ON' : 'OFF'}</div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={forceSpawn}
                    className="bg-cyan-600 px-2 py-1 rounded text-white text-xs"
                  >
                    Force Spawn
                  </button>
                  <button
                    onClick={() => { setPlaced(false); setAnchor(null); }}
                    className="bg-purple-600 px-2 py-1 rounded text-white text-xs"
                  >
                    Re-place
                  </button>
                </div>
              </div>

              {alienVisible && alienStatus === 'IDLE' && (
                <SayHiButton onSayHi={handleSayHi} deadline={spawnDeadline} />
              )}
            </>
          )}
        </>
      )}

      <AnimatePresence>
        {inConversation && conversationPhase === 'hold' && (
          <ConversationInterface
            key="chat"
            messages={conversationMessages}
            timeLeft={conversationTimeLeft}
            isVoiceEnabled={settings.voiceEnabled}
            isListening={isListening}
            isThinking={alienStatus === 'THINKING'}
            rect={chatRect}
            onSendMessage={handleSendMessage}
            onStartVoice={handleStartVoice}
            onStopVoice={handleStopVoice}
            onEndConversation={endConversation}
          />
        )}
      </AnimatePresence>

      {screen === GameScreen.COLLECTION && (
        <EncounterCollection
          encounters={storageService.getEncounters()}
          onClose={() => setScreen(GameScreen.MENU)}
        />
      )}

      {showARTest && <ARTest onClose={() => setShowARTest(false)} />}
    </div>
  );
}
