import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Download, Flame, Play, Settings as SettingsIcon, Volume2, VolumeX } from 'lucide-react';
import type { Progress } from '../services/progressService';
import type { InstallMode } from '../hooks/useInstallPrompt';

interface TitleScreenProps {
  progress: Progress;
  encounterCount: number;
  soundOn: boolean;
  installMode: InstallMode;
  onStart: () => void;
  onCodex: () => void;
  onSettings: () => void;
  onInstall: () => void;
  onToggleSound: () => void;
}

const TitleScreen: React.FC<TitleScreenProps> = ({
  progress,
  encounterCount,
  soundOn,
  installMode,
  onStart,
  onCodex,
  onSettings,
  onInstall,
  onToggleSound
}) => {
  const discovered = Object.keys(progress.variants).length;
  const returning = progress.contacts > 0;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden" data-testid="title-screen">
      {/* The alien peeks in from the right edge of the title screen, like in the game. */}
      <motion.img
        src="/aliens/peek-wave.gif"
        alt=""
        aria-hidden
        className="absolute pointer-events-none select-none flicker"
        style={{ right: 0, bottom: '18%', height: 'min(44vh, 360px)', width: 'auto' }}
        initial={{ x: '70%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.9, type: 'spring', damping: 22, stiffness: 90 }}
      />

      <div className="relative h-full flex flex-col safe-inset">
        <div className="flex justify-end gap-2">
          <button
            onClick={onToggleSound}
            aria-label={soundOn ? 'Mute sound' : 'Unmute sound'}
            className="p-2.5 rounded-full bg-white/5 border border-white/10"
          >
            {soundOn ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-gray-400" />}
          </button>
          <button onClick={onSettings} aria-label="Settings" className="p-2.5 rounded-full bg-white/5 border border-white/10">
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-md w-full mx-auto">
          <motion.p
            className="font-signal text-[11px] uppercase text-cyan-300/80 mb-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 1] }}
            transition={{ duration: 1.6 }}
          >
            {returning ? '▸ familiar signal detected' : '▸ unidentified signal'}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-[clamp(2.4rem,11vw,4rem)] leading-[0.95] font-black tracking-tight"
          >
            <span className="text-white">Hi,</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-amber-200">
              I'm an Alien
            </span>
          </motion.h1>
          <motion.p
            className="text-gray-300/90 mt-4 text-[15px] leading-relaxed max-w-[17rem]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Something keeps peeking into your camera. Say hi before it slips away.
          </motion.p>

          {returning && (
            <div className="flex flex-wrap gap-2 mt-5 text-xs font-signal" data-testid="title-stats">
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-400/30 text-orange-200">
                <Flame className="w-3.5 h-3.5" /> {progress.streak} day streak
              </span>
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-200">
                {progress.contacts} contacts
              </span>
              <span className="px-2.5 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-400/30 text-fuchsia-200">
                {discovered} forms seen
              </span>
            </div>
          )}
        </div>

        <div className="max-w-md w-full mx-auto flex flex-col gap-3 pb-2 relative">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onStart}
            data-testid="start-button"
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-[0_0_40px_rgba(6,182,212,0.35)]"
          >
            <Play className="w-5 h-5" /> {returning ? 'Look again' : 'Begin'}
          </motion.button>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCodex}
              data-testid="codex-button"
              className="bg-white/5 border border-white/10 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" /> Sightings ({encounterCount})
            </button>
            {installMode === 'native' || installMode === 'ios' ? (
              <button
                onClick={onInstall}
                data-testid="install-button"
                className="bg-white/5 border border-cyan-400/30 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 text-cyan-200"
              >
                <Download className="w-4 h-4" /> Install
              </button>
            ) : (
              <button
                onClick={onSettings}
                className="bg-white/5 border border-white/10 py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2"
              >
                <SettingsIcon className="w-4 h-4" /> Settings
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TitleScreen;
