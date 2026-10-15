import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Mic, RotateCcw, Trash2, Vibrate, Volume2, X } from 'lucide-react';
import type { AppSettings } from '../services/progressService';

interface SettingsPanelProps {
  settings: AppSettings & { cameraEnabled: boolean };
  voiceSupported: boolean;
  vibrationSupported: boolean;
  aiMode: string;
  onChange: (s: Partial<AppSettings & { cameraEnabled: boolean }>) => void;
  onReplayTutorial: () => void;
  onReset: () => void;
  onClose: () => void;
}

const Toggle: React.FC<{
  label: string;
  sub?: string;
  icon: React.ElementType;
  on: boolean;
  disabled?: boolean;
  testId?: string;
  onChange: (v: boolean) => void;
}> = ({ label, sub, icon: Icon, on, disabled, testId, onChange }) => (
  <button
    role="switch"
    aria-checked={on}
    disabled={disabled}
    data-testid={testId}
    onClick={() => onChange(!on)}
    className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10 disabled:opacity-40 text-left"
  >
    <Icon className="w-5 h-5 text-cyan-300 shrink-0" />
    <span className="flex-1 min-w-0">
      <span className="block font-semibold">{label}</span>
      {sub && <span className="block text-xs text-gray-400 mt-0.5">{sub}</span>}
    </span>
    <span className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 ${on && !disabled ? 'bg-cyan-500' : 'bg-white/15'}`}>
      <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${on && !disabled ? 'translate-x-5' : ''}`} />
    </span>
  </button>
);

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  voiceSupported,
  vibrationSupported,
  aiMode,
  onChange,
  onReplayTutorial,
  onReset,
  onClose
}) => {
  const [confirmReset, setConfirmReset] = useState(false);

  return (
    <motion.div
      className="absolute inset-0 z-[85] bg-[#05060f]/95 backdrop-blur-md overflow-y-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      data-testid="settings"
    >
      <div className="max-w-md mx-auto safe-inset">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button onClick={onClose} aria-label="Close settings" className="p-2 -mr-2 rounded-full hover:bg-white/10">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-3">
          <Toggle
            label="Sound"
            sub="Chimes when it appears, leaves and speaks"
            icon={Volume2}
            on={settings.soundEnabled}
            testId="toggle-sound"
            onChange={v => onChange({ soundEnabled: v })}
          />
          <Toggle
            label="Voice"
            sub={voiceSupported ? 'It reads its lines aloud; mic button in chat' : 'Speech is not supported in this browser'}
            icon={Mic}
            on={settings.voiceEnabled}
            disabled={!voiceSupported}
            testId="toggle-voice"
            onChange={v => onChange({ voiceEnabled: v })}
          />
          <Toggle
            label="Vibration"
            sub={vibrationSupported ? 'Buzz when it appears or slips away' : 'This device cannot vibrate from the web (e.g. iPhone)'}
            icon={Vibrate}
            on={settings.vibrationEnabled}
            disabled={!vibrationSupported}
            testId="toggle-vibration"
            onChange={v => onChange({ vibrationEnabled: v })}
          />
          <Toggle
            label="Camera backdrop"
            sub="Off = it visits you in the star-room"
            icon={Camera}
            on={settings.cameraEnabled}
            testId="toggle-camera"
            onChange={v => onChange({ cameraEnabled: v })}
          />
        </div>

        <div className="mt-8 space-y-3">
          <button
            onClick={onReplayTutorial}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10"
          >
            <RotateCcw className="w-5 h-5 text-cyan-300" />
            <span className="font-semibold">Replay how-to-play</span>
          </button>

          {!confirmReset ? (
            <button
              onClick={() => setConfirmReset(true)}
              data-testid="reset-data"
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-red-500/5 border border-red-400/20 text-red-300"
            >
              <Trash2 className="w-5 h-5" />
              <span className="font-semibold">Reset all data</span>
            </button>
          ) : (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-400/40">
              <p className="text-sm text-red-100 mb-3">
                Forget every sighting, conversation, streak and setting? It will treat you like a stranger.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmReset(false)} className="flex-1 py-2.5 rounded-xl bg-white/10 font-semibold">
                  Keep
                </button>
                <button
                  onClick={() => {
                    setConfirmReset(false);
                    onReset();
                  }}
                  data-testid="reset-confirm"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 font-semibold"
                >
                  Forget everything
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-8 font-signal leading-relaxed">
          Voice of the alien: {aiMode}
          <br />
          Everything is saved on this device only.
        </p>
      </div>
    </motion.div>
  );
};

export default SettingsPanel;
