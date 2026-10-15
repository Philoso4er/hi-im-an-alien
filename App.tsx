import React, { useState, useEffect, useRef, useMemo, lazy, Suspense, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, Home, Pause, Play, Scan, Settings as SettingsIcon, Sparkles, X } from 'lucide-react';

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
import RadarHUD from './components/RadarHUD';
import {
  computeStageLayout,
  computeXRChatRect,
  ConversationPhase,
  useViewport
} from './components/alienStage';
import type { XRStageHandle, XRScreenAnchor, XRRadarInfo } from './components/XRAlienStage';
import { heading, wrapDeg, DRAG_DEG_PER_PX } from './services/heading';
import { GifPlayer } from './services/gifPlayer';
import { isImmersiveARSupported, requestARSession } from './services/xrService';
import { useInstallPrompt } from './hooks/useInstallPrompt';

import { audioService } from './services/audioService';
import { voiceService } from './services/voiceService';
import { storageService } from './services/storageService';
import { progressService, pickMemorableLine, AppSettings, Progress } from './services/progressService';
import { haptics } from './services/haptics';
import { AlienVariant, VARIANTS, rollVariant } from './services/variants';
import { getAlienResponse, getAlienGreeting, getAlienFarewell, getAIMode, startAIEncounter } from './services/geminiService';

// three.js is only downloaded on devices that actually support WebXR AR.
const XRAlienStage = lazy(() => import('./components/XRAlienStage'));

const ALIEN_VISIBLE_DURATION = 5000; // Say-hi window, starts once it's actually on screen
const FIND_WINDOW = 25000; // how long it lingers nearby before it retreats unseen
const CONVERSATION_TIME_LIMIT = 90;
const QS = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const DEBUG = QS.has('debug');
/** Short gaps between wild spawns (testing). */
const FAST = DEBUG || QS.has('fast');
/** Hidden fallback: old reticle + "Place Alien Here" in WebXR. */
const MANUAL_PLACE = QS.has('place');

type Hunt = 'none' | 'hunting' | 'spotted';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
/** Fallback view: fully leaning out within 10 deg of where you look, hidden beyond 30 deg. */
const revealFor = (delta: number) => clamp01((30 - Math.abs(delta)) / 20);

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
  // Wild-encounter state: it spawns on its own, out of view; you turn to find it.
  const [hunt, setHunt] = useState<Hunt>('none');
  const huntRef = useRef<Hunt>('none');
  huntRef.current = hunt;
  const [peekEdge, setPeekEdge] = useState<'left' | 'right'>('right');
  const [peekReveal, setPeekReveal] = useState(0);
  const [radar, setRadar] = useState<{ delta: number; onScreen: boolean } | null>(null);
  const [hasSensor, setHasSensor] = useState(false);
  const [spawnTick, setSpawnTick] = useState(0);
  const alienBearingRef = useRef(0);
  const huntTimeoutRef = useRef<number | null>(null);
  const huntDeadlineRef = useRef(0);
  const remainingHuntRef = useRef<number | null>(null);

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
  const dragRef = useRef<number | null>(null);
  const xrStageRef = useRef<XRStageHandle>(null);
  const [xrSupported, setXrSupported] = useState(false);
  const [xrSession, setXrSession] = useState<XRSession | null>(null);
  const [xrHasFloor, setXrHasFloor] = useState(false);
  const [xrFloor, setXrFloor] = useState<'scanning' | 'found' | 'estimated'>('scanning');
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

  // ---- Heading (where the player looks): phone orientation + drag ----
  useEffect(() => {
    if (!inGame) return;
    heading.start();
    if (heading.hasSensor) setHasSensor(true);
    const un = heading.subscribe(() => {
      if (heading.hasSensor) setHasSensor(true);
    });
    return un;
  }, [inGame]);

  // Camera/star-room fallback: radar + how far the alien leans out, from the heading.
  useEffect(() => {
    if (xrSession || hunt === 'none') return;
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      if (t - last < 33) return;
      last = t;
      const d = wrapDeg(alienBearingRef.current - heading.value);
      const reveal = revealFor(d);
      // Once spotted it stops hiding and leans all the way out (unless you look well away).
      const shown = huntRef.current === 'spotted' && Math.abs(d) < 30 ? 1 : reveal;
      setRadar(prev =>
        prev && Math.abs(prev.delta - d) < 0.3 && prev.onScreen === reveal >= 0.55 ? prev : { delta: d, onScreen: reveal >= 0.55 }
      );
      setPeekReveal(r => (Math.abs(r - shown) < 0.01 ? r : shown));
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [xrSession, hunt]);

  // WebXR: the stage reports where the alien is relative to the camera.
  const handleXRRadar = useCallback((info: XRRadarInfo | null) => {
    setRadar(prev => {
      if (!info) return null;
      if (prev && Math.abs(prev.delta - info.delta) < 0.5 && prev.onScreen === info.onScreen) return prev;
      return { delta: info.delta, onScreen: info.onScreen };
    });
  }, []);

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
    // Freeze the 5-second say-hi window and the 25-second find window.
    if (alienTimeoutRef.current) {
      clearTimeout(alienTimeoutRef.current);
      alienTimeoutRef.current = null;
      remainingPeekRef.current = Math.max(800, spawnDeadlineRef.current - Date.now());
    }
    if (huntTimeoutRef.current) {
      clearTimeout(huntTimeoutRef.current);
      huntTimeoutRef.current = null;
      remainingHuntRef.current = Math.max(1500, huntDeadlineRef.current - Date.now());
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
    if (remainingHuntRef.current != null) {
      const rem = remainingHuntRef.current;
      remainingHuntRef.current = null;
      huntDeadlineRef.current = Date.now() + rem;
      huntTimeoutRef.current = window.setTimeout(handleUnseenRef.current, rem);
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

  const clearEncounterTimers = () => {
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    if (huntTimeoutRef.current) clearTimeout(huntTimeoutRef.current);
    alienTimeoutRef.current = null;
    huntTimeoutRef.current = null;
    remainingPeekRef.current = null;
    remainingHuntRef.current = null;
  };

  /**
   * A wild encounter: the alien turns up on its own somewhere off to the side
   * (30-120 deg from where you look). In WebXR the stage picks a real floor spot;
   * in the camera / star-room view it waits just past a screen edge. Nothing is
   * placed by the player.
   */
  const spawnWild = (manual = false) => {
    if (pausedRef.current || screenRef.current !== GameScreen.PLAYING || alienVisibleRef.current) return;
    if (xrSessionRef.current) {
      const ok = manual ? xrStageRef.current?.place() : xrStageRef.current?.spawn();
      if (!ok) {
        window.setTimeout(() => setSpawnTick(t => t + 1), 1500);
        return;
      }
      setPeekEdge('right');
    } else {
      const side = Math.random() < 0.5 ? -1 : 1;
      alienBearingRef.current = heading.value + side * (30 + Math.random() * 90);
      setPeekEdge(side > 0 ? 'right' : 'left');
      setPeekReveal(0);
    }
    setVariant(rollVariant());
    setAlienMessage(null);
    setConversationPhase('none');
    setAlienStatus('IDLE');
    setRadar(null);
    setAlienVisible(true);
    setHunt('hunting');
    huntRef.current = 'hunting';
    hadSpawnRef.current = true;
    haptics.pulse(10);

    clearEncounterTimers();
    huntDeadlineRef.current = Date.now() + FIND_WINDOW;
    huntTimeoutRef.current = window.setTimeout(handleUnseenRef.current, FIND_WINDOW);
  };
  const hadSpawnRef = useRef(false);
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const alienVisibleRef = useRef(alienVisible);
  alienVisibleRef.current = alienVisible;
  const xrSessionRef = useRef<XRSession | null>(null);
  xrSessionRef.current = xrSession;

  /** It came into view: now the 5-second say-hi window starts. */
  const handleSpotted = () => {
    if (huntRef.current !== 'hunting') return;
    if (huntTimeoutRef.current) clearTimeout(huntTimeoutRef.current);
    huntTimeoutRef.current = null;
    setHunt('spotted');
    huntRef.current = 'spotted';
    spawnedAtRef.current = Date.now();
    setSpawnDeadline(Date.now() + ALIEN_VISIBLE_DURATION);
    progressService.recordSighting();
    const v = variantRef.current;
    const rare = v.rarity === 'rare' || v.rarity === 'mythic';
    audioService.play(rare ? 'rare' : 'spawn');
    if (rare) haptics.rare();
    else haptics.spot();
    if (alienTimeoutRef.current) clearTimeout(alienTimeoutRef.current);
    alienTimeoutRef.current = window.setTimeout(handleMissRef.current, ALIEN_VISIBLE_DURATION);
  };
  const handleSpottedRef = useRef(handleSpotted);
  handleSpottedRef.current = handleSpotted;

  useEffect(() => {
    if (hunt === 'hunting' && radar?.onScreen && !paused) handleSpottedRef.current();
  }, [hunt, radar, paused]);

  const retreat = (title: string, body: string) => {
    setTimeout(() => {
      setAlienVisible(false);
      setHunt('none');
      huntRef.current = 'none';
      setRadar(null);
      showToast({ title, body }, 3000);
    }, 800);
  };

  /** Seen, but you didn't say hi in time. */
  const handleMiss = () => {
    alienTimeoutRef.current = null;
    setAlienStatus('MISSED');
    audioService.play('miss');
    haptics.miss();
    progressService.recordMiss();
    refreshProgress();
    retreat('It slipped away…', 'Keep looking. Something else will turn up.');
  };
  const handleMissRef = useRef(handleMiss);
  handleMissRef.current = handleMiss;

  /** Never found within the find window. */
  const handleUnseen = () => {
    huntTimeoutRef.current = null;
    if (huntRef.current !== 'hunting') return;
    setAlienStatus('MISSED');
    retreat('The signal faded…', 'Whatever it was, it moved on.');
  };
  const handleUnseenRef = useRef(handleUnseen);
  handleUnseenRef.current = handleUnseen;

  // Wild spawns on their own at random intervals while you're playing.
  useEffect(() => {
    if (screen !== GameScreen.PLAYING || paused || alienVisible || showSettings) return;
    if (xrSession && xrFloor === 'scanning' && !MANUAL_PLACE) return; // still learning the floor
    if (xrSession && MANUAL_PLACE) return; // hidden fallback: wait for the Place button
    const first = !hadSpawnRef.current;
    const ms = FAST ? 1500 : first ? 2500 + Math.random() * 2500 : 7000 + Math.random() * 13000;
    const t = window.setTimeout(() => spawnWild(), ms);
    return () => clearTimeout(t);
  }, [screen, paused, alienVisible, showSettings, xrSession, xrFloor, spawnTick]);

  const startExploring = async () => {
    audioService.init();
    audioService.play('click');
    haptics.tap();
    // iOS asks for motion access here (needs this tap).
    const granted = await requestMotionPermission();
    setMotionPermissionGranted(granted);
    heading.start();
    hadSpawnRef.current = false;
    setHunt('none');
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

  const resetWild = () => {
    clearEncounterTimers();
    setAlienVisible(false);
    setHunt('none');
    huntRef.current = 'none';
    setRadar(null);
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
          setXrFloor('scanning');
          resetWild();
        });
        resetWild();
        setXrFloor('scanning');
        hadSpawnRef.current = false;
        setXrSession(session);
      })
      .catch(err => {
        console.error('Could not start AR:', err);
        setXrError('AR could not start on this device. Using the camera view instead.');
        showToast({ title: 'AR unavailable', body: 'Using the camera view instead.' });
      });
  };

  const conversationContext = (history: { role: string; content: string }[]) => ({
    encounterCount: storageService.getStats().encounterCount,
    previousTopics: storageService.getMemoryTopics(),
    timeOfDay: storageService.getTimeOfDay(),
    messageHistory: history
  });

  const handleSayHi = async () => {
    clearEncounterTimers();
    setHunt('none');
    huntRef.current = 'none';

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
      startAIEncounter();
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
    setHunt('none');
    setRadar(null);

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
    clearEncounterTimers();
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
    setHunt('none');
    setRadar(null);
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

  // The camera notice dismisses itself after a while.
  useEffect(() => {
    if (cameraStatus !== 'denied' && cameraStatus !== 'unavailable') return;
    const t = window.setTimeout(() => setCameraNoticeDismissed(true), 9000);
    return () => clearTimeout(t);
  }, [cameraStatus]);

  // ---- Render ----
  const alienLayerActive = (screen === GameScreen.PLAYING && alienVisible) || inConversation;
  const radarHint = xrSession
    ? xrFloor === 'scanning'
      ? 'Scanning surroundings…'
      : null
    : hunt === 'hunting'
    ? hasSensor
      ? 'Turn to look around'
      : 'Drag to look around'
    : null;
  const chatRect = xrSession ? computeXRChatRect(layout, xrAnchor) : layout.chat;
  const cameraWanted = settings.cameraEnabled && inGame && !xrSession;
  const cameraLive = cameraWanted && cameraStatus === 'active';
  const showCameraNotice =
    screen === GameScreen.PLAYING && !xrSession && settings.cameraEnabled && (cameraStatus === 'denied' || cameraStatus === 'unavailable') && !cameraNoticeDismissed;

  return (
    <div
      ref={rootRef}
      className={`relative w-full h-dvh overflow-hidden select-none ${xrSession ? 'bg-transparent' : 'bg-black'}`}
      data-screen={screen}
      data-camera={cameraStatus}
    >
      {/* Star-room backdrop: menus, and gameplay when there's no camera. */}
      {!xrSession && !cameraLive && <Backdrop variant={inGame ? 'room' : 'space'} getHeading={inGame ? () => heading.value : undefined} />}

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
            placed={alienVisible || inConversation}
            onReticleChange={setXrHasFloor}
            onScreenAnchor={setXrAnchor}
            tint={variant.xrTint}
            showReticle={MANUAL_PLACE}
            onFloorChange={setXrFloor}
            onRadar={handleXRRadar}
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
        <div data-testid="alien-layer" data-variant={variant.id} data-hunt={hunt}>
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
            peekEdge={peekEdge}
            peekReveal={xrSession ? 1 : peekReveal}
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
          {/* Look around by dragging (no motion sensor / desktop). Sits under all UI. */}
          {!xrSession && (
            <div
              className="absolute inset-0 z-10"
              style={{ touchAction: 'none', cursor: 'grab' }}
              data-testid="pan-surface"
              onPointerDown={e => {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                dragRef.current = e.clientX;
              }}
              onPointerMove={e => {
                if (dragRef.current == null) return;
                const dx = e.clientX - dragRef.current;
                dragRef.current = e.clientX;
                heading.addDrag(-dx * DRAG_DEG_PER_PX); // swipe left to look right
              }}
              onPointerUp={() => (dragRef.current = null)}
              onPointerCancel={() => (dragRef.current = null)}
            />
          )}

          <RadarHUD
            active={hunt !== 'none' && alienStatus !== 'MISSED'}
            delta={radar ? radar.delta : null}
            spotted={hunt === 'spotted'}
            hint={radarHint}
          />

          {xrSupported && !xrSession && hunt === 'none' && (
            <div className="absolute left-0 right-0 z-50 flex justify-center" style={{ bottom: 'calc(2rem + var(--sab))' }}>
              <button
                onClick={startXR}
                data-testid="start-xr"
                className="bg-black/55 backdrop-blur-sm border border-cyan-300/50 text-white font-semibold py-2.5 px-5 rounded-full flex items-center gap-2 text-sm"
              >
                <Scan className="w-4 h-4" /> Real-floor AR
              </button>
            </div>
          )}

          {/* Hidden fallback (?place=1): the old reticle + Place button in WebXR. */}
          {xrSession && MANUAL_PLACE && !alienVisible && (
            <ARCalibration
              onPlace={() => spawnWild(true)}
              motionSupported={motionSupported}
              xrSupported={xrSupported}
              xrActive
              xrHasFloor={xrHasFloor}
              xrError={xrError}
            />
          )}

          {DEBUG && (
            <div className="absolute top-28 left-4 z-50 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-mono">
              <div className="text-cyan-400">Hunt: {hunt}</div>
              <div>Alien: {alienVisible ? 'VISIBLE' : 'HIDDEN'} · {alienStatus}</div>
              <div>Variant: {variant.id}</div>
              <div>Delta: {radar ? radar.delta.toFixed(0) : '-'}° · reveal {peekReveal.toFixed(2)}</div>
              <div>Mode: {xrSession ? `WebXR (${xrFloor})` : cameraLive ? 'Camera' : 'Star-room'}</div>
              <div>Motion: {motionPermissionGranted ? 'ON' : 'OFF'} · sensor {hasSensor ? 'yes' : 'no'}</div>
              <button onClick={() => spawnWild()} className="mt-2 bg-cyan-600 px-2 py-1 rounded text-xs">
                Force Spawn
              </button>
            </div>
          )}

          {alienVisible && alienStatus === 'IDLE' && hunt === 'spotted' && (
            <SayHiButton onSayHi={handleSayHi} deadline={spawnDeadline} />
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
