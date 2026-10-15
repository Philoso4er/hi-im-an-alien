import React from 'react';
import { motion } from 'framer-motion';
import { Download, Share, PlusSquare, X } from 'lucide-react';
import type { InstallMode } from '../hooks/useInstallPrompt';

interface InstallSheetProps {
  mode: InstallMode;
  onInstall: () => void;
  onClose: () => void;
}

/** Bottom sheet: native install on Android/desktop Chrome, Add-to-Home-Screen steps on iOS. */
const InstallSheet: React.FC<InstallSheetProps> = ({ mode, onInstall, onClose }) => (
  <motion.div
    className="absolute inset-0 z-[90] flex items-end justify-center bg-black/60"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    onClick={onClose}
  >
    <motion.div
      role="dialog"
      aria-label="Install the game"
      className="w-full max-w-md bg-[#0b0d1d] border-t border-x border-cyan-400/30 rounded-t-3xl p-6 safe-bottom"
      initial={{ y: 300 }}
      animate={{ y: 0 }}
      exit={{ y: 300 }}
      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src="/icons/icon-96.png" alt="" className="w-12 h-12 rounded-xl" />
          <div>
            <p className="font-bold text-lg leading-tight">Keep it on your home screen</p>
            <p className="text-gray-400 text-xs">Full screen, works offline, opens instantly.</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close" className="p-2 -mr-2 -mt-2 rounded-full hover:bg-white/10">
          <X className="w-5 h-5" />
        </button>
      </div>

      {mode === 'native' && (
        <button
          onClick={onInstall}
          className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 py-4 rounded-2xl font-bold flex items-center justify-center gap-2"
        >
          <Download className="w-5 h-5" /> Install app
        </button>
      )}

      {mode === 'ios' && (
        <ol className="space-y-3 text-sm text-gray-200">
          <li className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-cyan-500/20 text-cyan-300 grid place-items-center font-bold">1</span>
            <span>
              Tap <Share className="inline w-4 h-4 mx-0.5 -mt-1 text-cyan-300" /> <b>Share</b> in Safari's toolbar
            </span>
          </li>
          <li className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-cyan-500/20 text-cyan-300 grid place-items-center font-bold">2</span>
            <span>
              Scroll and choose <PlusSquare className="inline w-4 h-4 mx-0.5 -mt-1 text-cyan-300" /> <b>Add to Home Screen</b>
            </span>
          </li>
          <li className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <span className="w-7 h-7 shrink-0 rounded-full bg-cyan-500/20 text-cyan-300 grid place-items-center font-bold">3</span>
            <span>
              Tap <b>Add</b>. Open it from the new icon.
            </span>
          </li>
          <li className="text-xs text-gray-500 pt-1">In Chrome on iPhone, use the Share button in the address bar.</li>
        </ol>
      )}
    </motion.div>
  </motion.div>
);

export default InstallSheet;
