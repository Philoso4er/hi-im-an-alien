import React, { useState, useEffect, useRef, useMemo, lazy, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Home, Pause, Play, Settings as SettingsIcon, Sparkles, X } from 'lucide-react';

import { GameScreen, AlienStatus, ConversationMessage } from './types';

import CameraFeed, { CameraStatus } from './components/CameraFeed';
import Backdrop from './components/Backdrop';
import Alien from './components/Alien';
import SayHiButton from './components/SayHiButton';
import ConversationInterface from './components/ConversationInterface';
import SightingsCodex from './components/SightingsCodex';
import TitleScreen from './components/TitleScreen';
import Onboarding from './components/Onboarding';
import SettingsPanel from './components/SettingsPanel';
import InstallSheet from './components/InstallSheet';
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
import { useInstallPrompt } from './hooks/useInstallPrompt';

import { audioService } from './services/audioService';
import { voiceService } from './services/voiceService';
import { storageService } from './services/storageService';
import { progressService, pickMemorableLine, AppSettings, Progress } from './services/progressService';
import { haptics } from './services/haptics';
import { AlienVariant, VARIANTS, rollVariant } from './services/variants';
import { getAlienResponse, getAlienGreeting, getAlienFarewell, getAIMode } from './services/geminiService';

// three.js is only downloaded on devices that actually support WebXR AR.
const XRAlienStage = lazy(() => import('./components/XRAlienStage'));

const ALIEN_VISIBLE_DURATION = 5000;
const CONVERSATION_TIME_LIMIT = 90;
const DEBUG = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug');

interface OrientationSample {
  alpha: number;
  beta: number;
  gamma: number;
}

interface Toast {
  id: number;
  title: string;
  body?: string;
  accent?: string;
  action?: { label: string; onClick: () => void };
}

const DEFAULT_SETTINGS: AppSettings = {
  soundEnabled: true,
  voiceEnabled: voiceService.isSupported(),
  vibrationEnabled: true,
  cameraEnabled: true
};

export default function App() {
  const [screen, setScreen] = useState<GameScreen>(GameScreen.SPLASH);
  const [alienVisible, setAlienVisible] = useState(false);
  const [alienStatus, setAlienStatus] = useState<AlienStatus>('IDLE');
  const [conversationPhase, setConversationPhase] = useState<ConversationPhase>('none');
  const [spawnDeadline, setSpawnDeadline] = useState(0);
  const [alienMessage, setAlienMessage] = useState<string | null>(null);
  const [variant, setVariant] = useState<AlienVariant>(VARIANTS[0]);

  const [motionSupported] = useState<boolean>(
    () => typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
  );
  const [motionPermissionGranted, setMotionPermissionGranted] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [anchor, setAnchor] = useState<OrientationSample | null>(null);
  const [liveOrientation, setLiveOrientation] = useState<OrientationSample>({ alpha: 0, beta: 0, gamma: 0 });
  const [arOpacity, setArOpacity] = useState(1);

  const [conversationMessages, setConversationMessages] = useState<ConversationMessage[]>([]);
  const [conversationTimeLeft, setConversationTimeLeft] = useState(CONVERSATION_TIME_LIMIT);
  const [currentEncounterId, setCurrentEncounterId] = useState<string>('');
  const [encounterStartTime, setEncounterStartTime] = useState<number>(0);
  const [isListening, setIsListening] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => progressService.getSettings(DEFAULT_SETTINGS));
  const [progress, setProgress] = useState<Progress>(() => progressService.get());
  const [encounters, setEncounters] = useState(() => storageService.getEncounters());
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraNoticeDismissed, setCameraNoticeDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [newVariantBanner, setNewVariantBanner] = useState<AlienVariant | null>(null);
  const [aiMode, setAiMode] = useState('scripted, free, works offline');
  const { mode: installMode, promptInstall } = useInstallPrompt();

  const alienTimeoutRef = useRef<number | null>(null);
  const conversationTimerRef = useRef<number | null>(null);
  const phaseSafetyRef = useRef<number | null>(null);
  const endingRef = useRef(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const spawnedAtRef = useRef(0);
  const remainingPeekRef = useRef<number | null>(null);
  const messagesRef = useRef<ConversationMessage[]>([]);
  messagesRef.current = conversationMessages;
  const variantRef = useRef(variant);
  variantRef.current = variant;

  // One GIF player for the whole game: drawn in the DOM (fallback) or as a WebXR texture.
  const alienPlayer = useMemo(() => new GifPlayer(), []);
  const viewport = useViewport();
  const layout = useMemo(
    () => computeStageLayout(viewport.vw, viewport.vh, viewport.visualH, viewport.insets),
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

  const inGame = screen === GameScreen.PLAYING || screen === GameScreen.CONVERSATION;
  const inConversation = screen === GameScreen.CONVERSATION;

  useEffect(() => {
    isImmersiveARSupported().then(setXrSupported);
    getAIMode().then(setAiMode);
  }, []);

  useEffect(() => {
    if (screen === GameScreen.SPLASH) {
      const t = setTimeout(() => setScreen(GameScreen.MENU), 1400);
      return () => clearTimeout(t);
    }
  }, [screen]);

  useEffect(() => {
    audioService.setSettings(settings.soundEnabled, settings.soundEnabled);
    haptics.setEnabled(settings.vibrationEnabled);
    if (!settings.voiceEnabled) voiceService.stopSpeaking();
    progressService.saveSettings(settings);
  }, [settings]);

  const refreshProgress = () => {
    setProgress(progressService.get());
    setEncounters(storageService.getEncounters());
  };

  const showToast = useCallback((t: Omit<Toast, 'id'>, ms = 4200) => {
    const id = Date.now();
    setToast({ ...t, id });
    window.setTimeout(() => setToast(cur => (cur && cur.id === id ? null : cur)), ms);
  }, []);

  // ---- Device-orientation parallax (camera fallback) ----
  useEffect(() => {
    if (!motionPermissionGranted) return;
    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta == null || e.gamma == null) return;
      setLiveOrientation({ alpha: e.alpha ?? 0, beta: e.beta, gamma: e.gamma });
    };
    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, [motionPermissionGranted]);

  useEffect(() => {
    if (!anchor) {
      setArOpacity(1);
      return;
    }
    const angleDiff = (a: number, b: number) => {
      let diff = a - b;
      while (diff > 180) diff -= 360;
      while (diff < -180) diff += 360;
      return diff;
    };
    const maxOffset = 260;
    const clampedX = Math.max(-maxOffset, Math.min(maxOffset, -angleDiff(liveOrientation.alpha, anchor.alpha) * 7));
    const clampedY = Math.max(-maxOffset, Math.min(maxOffset, (liveOrientation.beta - anchor.beta) * 5));
    const distanceFactor = Math.max(Math.abs(clampedX), Math.abs(clampedY)) / maxOffset;
    setArOpacity(Math.max(0.15, 1 - distanceFactor * 0.9));
  }, [liveOrientation, anchor]);

  // ---- Conversation countdown (stops while paused) ----
  useEffect(() => {
    if (screen === GameScreen.CONVERSATION) {
      conversationTimerRef.current = window.setInterval(() => {
        if (pausedRef.current || endingRef.current) return;
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
      if (conversationTimerRef.current) clearInterval(conversationTimerRef.current);
    };
  }, [screen]);

  // ---- Pause / resume ----
  const pause = () => {
    if (pausedRef.current || !inGameRef.current) return;
    setPaused(true);
    audioService.play('pause');
    voiceService.stopSpeaking();
    voiceService.stopListening();
    setIsListening(false);
    // Freeze the 5-second say-hi window.
    if (alienTimeoutRef.current) {
      clearTimeout(alienTimeoutRef.current);
      alienTimeoutRef.current = null;
      remainingPeekRef.current = Math.max(800, spawnDeadlineRef.current - Date.now());
    }
  };
  const resume = () => {
    setPaused(false);
    setShowSettings(false);
    audioService.init();
    audioService.play('click');
    if (remainingPeekRef.current != null) {
      const rem = remainingPeekRef.current;
      remainingPeekRef.current = null;
      setSpawnDeadline(Date.now() + rem);
      alienTimeoutRef.current = window.setTimeout(handleMissRef.current, rem);
    }
  };
  const inGameRef = useRef(inGame);
  inGameRef.current = inGame;
  const spawnDeadlineRef = useRef(spawnDeadline);
  spawnDeadlineRef.current = spawnDeadline;
  const pauseRef = useRef(pause);
  pauseRef.current = pause;

  // Leaving the app (switching tabs, locking the phone) pauses the encounter.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') pauseRef.current();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const requestMotionPermission = async (): Promise<boolean> => {
    const DOE = (window as any).DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        return (await DOE.requestPermission()) === 'granted';
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
    if (pausedRef.current) return;
    const v = rollVariant();
    setVariant(v);
    setAlienMessage(null);
    setConversationPhase('none');
    setAlienStatus('IDLE');
    spawnedAtRef.current = Date.now();
    setSpawnDeadline(Date.now() + ALIEN_VISIBLE_DURATION);
    setAlienVisible(true);

    progressService.recordSighting();
    const rare = v.rarity === 'rare' || v.rarity === 'mythic';
    audioService.play(rare ? 'rare' : 'spawn');
    if (rare) haptics.rare();
    else haptics.spot();

    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    alienTimeoutRef.current = window.setTimeout(handleMissRef.current, ALIEN_VISIBLE_DURATION);
  };

  const handleMiss = () => {
    alienTimeoutRef.current = null;
    setAlienStatus('MISSED');
    audioService.play('miss');
    haptics.miss();
    progressService.recordMiss();
    refreshProgress();

    setTimeout(() => {
      setAlienVisible(false);
      // Require re-placement for the next alien: this is what creates the
      // "search for it" feel without GPS.
      setPlaced(false);
      setAnchor(null);
      showToast({ title: 'It slipped away…', body: 'Point somewhere new and wait for it again.' }, 3000);
    }, 800);
  };
  const handleMissRef = useRef(handleMiss);
  handleMissRef.current = handleMiss;

  const startExploring = async () => {
    audioService.init();
    audioService.play('click');
    haptics.tap();
    const granted = await requestMotionPermission();
    setMotionPermissionGranted(granted);
    setPlaced(false);
    setAnchor(null);
    setPaused(false);
    setScreen(GameScreen.PLAYING);
  };

  const handleTitleStart = () => {
    audioService.init();
    if (!progressService.isOnboarded()) {
      audioService.play('click');
      setScreen(GameScreen.HOW_TO);
    } else {
      startExploring();
    }
  };

  const handleOnboardingDone = (useCamera: boolean) => {
    progressService.setOnboarded();
    setSettings(s => ({ ...s, cameraEnabled: useCamera }));
    setCameraNoticeDismissed(false);
    startExploring();
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
        setXrError('AR could not start on this device. Using the camera view instead.');
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
    haptics.tap();
    setTimeout(spawnAlienAtCrosshair, 800);
  };

  const conversationContext = (history: { role: string; content: string }[]) => ({
    encounterCount: storageService.getStats().encounterCount,
    previousTopics: storageService.getMemoryTopics(),
    timeOfDay: storageService.getTimeOfDay(),
    messageHistory: history
  });

  const handleSayHi = async () => {
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    alienTimeoutRef.current = null;

    setAlienStatus('NOTICED');
    audioService.play('success');
    haptics.contact();
    const { newVariant } = progressService.recordContact(variantRef.current.id, Date.now() - spawnedAtRef.current);
    refreshProgress();
    if (newVariant && variantRef.current.id !== 'observer') {
      setNewVariantBanner(variantRef.current);
      window.setTimeout(() => setNewVariantBanner(null), 4200);
    }

    setTimeout(async () => {
      const encounterId = `encounter_${Date.now()}`;
      setCurrentEncounterId(encounterId);
      setEncounterStartTime(Date.now());

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

      const greeting = await getAlienGreeting(conversationContext([]));
      if (endingRef.current) return;
      setConversationMessages([{ role: 'alien', content: greeting, timestamp: Date.now() }]);
      setAlienStatus('TALKING');

      if (settings.voiceEnabled && !pausedRef.current) {
        voiceService.speak(greeting, () => setAlienStatus('TALKING'), () => setAlienStatus('LISTENING'));
      }
    }, 1000);
  };

  const handleWalkInDone = () => {
    if (phaseSafetyRef.current) clearTimeout(phaseSafetyRef.current);
    setConversationPhase(p => (p === 'walk-in' ? 'hold' : p));
  };

  const handleSendMessage = async (userText: string) => {
    const userMessage: ConversationMessage = { role: 'user', content: userText, timestamp: Date.now() };
    setConversationMessages(prev => [...prev, userMessage]);
    setAlienStatus('THINKING');
    audioService.play('message');

    const alienResponse = await getAlienResponse(
      userText,
      conversationContext(conversationMessages.map(m => ({ role: m.role === 'alien' ? 'alien' : 'user', content: m.content })))
    );

    setTimeout(() => {
      if (endingRef.current) return;
      setConversationMessages(prev => [...prev, { role: 'alien', content: alienResponse, timestamp: Date.now() }]);
      setAlienStatus('TALKING');
      audioService.play('message');
      if (settings.voiceEnabled && !pausedRef.current) {
        voiceService.speak(alienResponse, () => setAlienStatus('TALKING'), () => setAlienStatus('LISTENING'));
      }
    }, 1500);
  };

  const handleStartVoice = () => {
    setIsListening(true);
    setAlienStatus('LISTENING');
    voiceService.startListening(
      transcript => {
        setIsListening(false);
        handleSendMessage(transcript);
      },
      error => {
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

  /** Persist the current conversation (encounter log + stats). */
  const saveCurrentEncounter = async () => {
    const messages = messagesRef.current;
    const endTime = Date.now();
    progressService.recordConversation(
      (endTime - encounterStartTime) / 1000,
      messages.filter(m => m.role === 'user').length
    );
    const location = await storageService.getLocation();
    storageService.saveEncounter({
      id: currentEncounterId,
      startTime: encounterStartTime,
      endTime,
      messages,
      location: location || undefined,
      timeOfDay: storageService.getTimeOfDay(),
      variantId: variantRef.current.id,
      memorableLine: pickMemorableLine(messages)
    });
    refreshProgress();
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

    const farewell = await getAlienFarewell({
      ...conversationContext([]),
      encounterCount: storageService.getStats().encounterCount
    });
    if (endingRef.current) {
      setAlienMessage(farewell);
      if (settings.voiceEnabled) voiceService.speak(farewell);
    }
    await saveCurrentEncounter();
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

    const p = progressService.get();
    const v = variantRef.current;
    const canInstall = (installMode === 'native' || installMode === 'ios') && p.contacts >= 1;
    showToast(
      {
        title: `Sighting logged · ${v.name}`,
        body: `Contact #${p.contacts} · ${p.streak} day streak`,
        accent: v.accent,
        action: canInstall ? { label: 'Install', onClick: () => setShowInstall(true) } : undefined
      },
      5200
    );
  };

  /** Pause menu → back to the title screen. */
  const quitToTitle = async () => {
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    alienTimeoutRef.current = null;
    remainingPeekRef.current = null;
    if (phaseSafetyRef.current) clearTimeout(phaseSafetyRef.current);
    voiceService.stopSpeaking();
    voiceService.stopListening();
    const wasTalking = screen === GameScreen.CONVERSATION && !endingRef.current && messagesRef.current.length > 0;
    endingRef.current = false;
    if (wasTalking) await saveCurrentEncounter();
    try {
      await xrSession?.end();
    } catch {
      /* already ended */
    }
    setPaused(false);
    setShowSettings(false);
    setAlienVisible(false);
    setAlienMessage(null);
    setConversationMessages([]);
    setConversationPhase('none');
    setPlaced(false);
    setAnchor(null);
    setScreen(GameScreen.MENU);
    refreshProgress();
  };

  const handleReset = () => {
    progressService.resetAll();
    setSettings(DEFAULT_SETTINGS);
    refreshProgress();
    setShowSettings(false);
    setPaused(false);
    setScreen(GameScreen.MENU);
    showToast({ title: 'Memory wiped.', body: 'It will greet you as a stranger.' });
  };

  const handleInstall = async () => {
    const ok = await promptInstall();
    setShowInstall(false);
    if (ok) showToast({ title: 'Installed.', body: 'Open it from your home screen.' });
  };

  // ---- Render ----
  const alienLayerActive = (screen === GameScreen.PLAYING && placed) || inConversation;
  const chatRect = xrSession ? computeXRChatRect(layout, xrAnchor) : layout.chat;
  const cameraWanted = settings.cameraEnabled && inGame && !xrSession;
  const cameraLive = cameraWanted && cameraStatus === 'active';
  const showCameraNotice =
    screen === GameScreen.PLAYING && !alienVisible && !xrSession && settings.cameraEnabled && (cameraStatus === 'denied' || cameraStatus === 'unavailable') && !cameraNoticeDismissed;

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-dvh overflow-hidden select-none ${xrSession ? 'bg-transparent' : 'bg-black'}`}
      data-screen={screen}
      data-camera={cameraStatus}
    >
      {/* Star-room backdrop: menus, and gameplay when there's no camera. */}
      {!xrSession && !cameraLive && <Backdrop variant={inGame ? 'room' : 'space'} />}

      {/* In WebXR the browser shows the camera itself; don't fight it for the camera. */}
      {!xrSession && <CameraFeed enabled={cameraWanted} onStatus={setCameraStatus} />}

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
            tint={variant.xrTint}
          />
        </Suspense>
      )}

      {screen === GameScreen.SPLASH && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center" data-testid="splash">
          <motion.img
            src="/icons/icon-192.png"
            alt=""
            className="w-24 h-24 rounded-3xl shadow-[0_0_60px_rgba(34,211,238,0.35)]"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          />
          <motion.p
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
            className="text-cyan-300 mt-6 font-signal text-xs uppercase"
          >
            Scanning for life forms…
          </motion.p>
        </div>
      )}

      {screen === GameScreen.MENU && (
        <TitleScreen
          progress={progress}
          encounterCount={encounters.length}
          soundOn={settings.soundEnabled}
          installMode={installMode}
          onStart={handleTitleStart}
          onCodex={() => {
            audioService.init();
            audioService.play('click');
            refreshProgress();
            setScreen(GameScreen.COLLECTION);
          }}
          onSettings={() => setShowSettings(true)}
          onInstall={() => setShowInstall(true)}
          onToggleSound={() => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }))}
        />
      )}

      {screen === GameScreen.HOW_TO && (
        <Onboarding onDone={handleOnboardingDone} onBack={() => setScreen(GameScreen.MENU)} />
      )}

      {alienLayerActive && (
        <div
          style={{ opacity: screen === GameScreen.PLAYING && !xrSession ? arOpacity : 1, transition: 'opacity 0.15s linear' }}
          data-testid="alien-layer"
          data-variant={variant.id}
        >
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
            variantFilter={variant.filter}
            variantClass={variant.className}
          />
        </div>
      )}

      {/* In-game HUD */}
      {inGame && !paused && (
        <div
          className="absolute top-0 left-0 right-0 z-[55] flex items-start justify-between px-3 pointer-events-none"
          style={{ paddingTop: 'max(0.75rem, var(--sat))' }}
        >
          <button
            onClick={pause}
            aria-label="Pause"
            data-testid="pause-button"
            className="pointer-events-auto p-2.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/15"
            style={{ visibility: inConversation && conversationPhase === 'hold' ? 'hidden' : 'visible' }}
          >
            <Pause className="w-5 h-5" />
          </button>
          {!inConversation && (
            <div className="flex gap-2 text-xs font-signal">
              <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-orange-400/30 text-orange-200">
                <Flame className="w-3.5 h-3.5" /> {progress.streak}
              </span>
              <span className="px-2.5 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-cyan-400/30 text-cyan-200">
                {progress.contacts} met
              </span>
            </div>
          )}
        </div>
      )}

      {screen === GameScreen.PLAYING && !paused && (
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
              {DEBUG && (
                <div className="absolute top-20 left-4 z-50 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-mono">
                  <div className="text-cyan-400">State: PLAYING</div>
                  <div>Alien: {alienVisible ? 'VISIBLE' : 'HIDDEN'} · {alienStatus}</div>
                  <div>Variant: {variant.id}</div>
                  <div>Mode: {xrSession ? 'WebXR floor' : cameraLive ? 'Camera fallback' : 'Star-room'}</div>
                  <div>Motion: {motionPermissionGranted ? 'ON' : 'OFF'}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={spawnAlienAtCrosshair} className="bg-cyan-600 px-2 py-1 rounded text-xs">
                      Force Spawn
                    </button>
                    <button onClick={() => { setPlaced(false); setAnchor(null); }} className="bg-purple-600 px-2 py-1 rounded text-xs">
                      Re-place
                    </button>
                  </div>
                </div>
              )}

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
            onPause={pause}
          />
        )}
      </AnimatePresence>

      {/* New variant discovered */}
      <AnimatePresence>
        {newVariantBanner && (
          <motion.div
            key="newvariant"
            className="absolute left-0 right-0 z-[75] flex justify-center px-4 pointer-events-none"
            style={{ top: 'calc(4rem + var(--sat))' }}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div
              className="px-4 py-2.5 rounded-2xl bg-black/75 backdrop-blur-md border flex items-center gap-2"
              style={{ borderColor: `${newVariantBanner.accent}88` }}
              data-testid="new-variant"
            >
              <Sparkles className="w-4 h-4" style={{ color: newVariantBanner.accent }} />
              <span className="text-sm">
                New form: <b style={{ color: newVariantBanner.accent }}>{newVariantBanner.name}</b>
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera denied / missing */}
      {showCameraNotice && (
        <div
          className="absolute left-0 right-0 z-[56] flex justify-center px-4"
          style={{ top: 'calc(10.5rem + var(--sat))' }}
          data-testid="camera-notice"
        >
          <div className="max-w-sm w-full bg-black/75 backdrop-blur-md border border-amber-300/30 rounded-2xl p-3 flex gap-3 items-start">
            <div className="flex-1 text-xs text-amber-50/90 leading-relaxed">
              <b className="text-amber-200">
                {cameraStatus === 'denied' ? 'Camera blocked.' : 'No camera found.'}
              </b>{' '}
              It will visit you in the star-room instead.
              {cameraStatus === 'denied' && ' To see it in your space, allow the camera in your browser’s site settings.'}
            </div>
            <button onClick={() => setCameraNoticeDismissed(true)} aria-label="Dismiss" className="p-1 -m-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Pause menu */}
      <AnimatePresence>
        {paused && inGame && !showSettings && (
          <motion.div
            key="pause"
            className="absolute inset-0 z-[80] bg-black/70 backdrop-blur-md flex flex-col items-center justify-center safe-inset"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            data-testid="pause-menu"
          >
            <p className="font-signal text-xs text-cyan-300/80 mb-2">SIGNAL HELD</p>
            <h2 className="text-3xl font-bold mb-2">Paused</h2>
            <p className="text-gray-400 text-sm mb-8 text-center max-w-xs">
              {inConversation ? `It waits. ${conversationTimeLeft}s of contact left.` : 'It is very good at waiting.'}
            </p>
            <div className="w-full max-w-xs flex flex-col gap-3">
              <button
                onClick={resume}
                data-testid="resume-button"
                className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" /> Resume
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="w-full bg-white/5 border border-white/10 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" /> Settings
              </button>
              <button
                onClick={quitToTitle}
                className="w-full bg-white/5 border border-white/10 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 text-gray-300"
              >
                <Home className="w-4 h-4" /> Title screen
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {screen === GameScreen.COLLECTION && (
        <SightingsCodex encounters={encounters} progress={progress} onClose={() => setScreen(GameScreen.MENU)} />
      )}

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel
            key="settings"
            settings={settings}
            voiceSupported={voiceService.isSupported()}
            vibrationSupported={haptics.supported()}
            aiMode={aiMode}
            onChange={patch => setSettings(s => ({ ...s, ...patch }))}
            onReplayTutorial={() => {
              setShowSettings(false);
              if (inGame) quitToTitle().then(() => setScreen(GameScreen.HOW_TO));
              else setScreen(GameScreen.HOW_TO);
            }}
            onReset={handleReset}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInstall && (installMode === 'native' || installMode === 'ios') && (
          <InstallSheet key="install" mode={installMode} onInstall={handleInstall} onClose={() => setShowInstall(false)} />
        )}
      </AnimatePresence>

      {/* Toasts */}
      <AnimatePresence>
        {toast && (screen === GameScreen.PLAYING || screen === GameScreen.MENU) && !showSettings && !paused && (
          <motion.div
            key={toast.id}
            className="absolute left-0 right-0 z-[95] flex justify-center px-4 pointer-events-none"
            style={
              screen === GameScreen.MENU ? { top: 'calc(4rem + var(--sat))' } : { bottom: 'calc(7.5rem + var(--sab))' }
            }
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            data-testid="toast"
          >
            <div
              className="pointer-events-auto max-w-sm w-full bg-black/80 backdrop-blur-md border rounded-2xl px-4 py-3 flex items-center gap-3"
              style={{ borderColor: toast.accent ? `${toast.accent}66` : 'rgba(255,255,255,0.15)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm" style={{ color: toast.accent }}>
                  {toast.title}
                </p>
                {toast.body && <p className="text-xs text-gray-400 mt-0.5">{toast.body}</p>}
              </div>
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/40"
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
