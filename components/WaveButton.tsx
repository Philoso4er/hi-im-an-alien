import React from 'react';
import { motion } from 'framer-motion';
import { Hand } from 'lucide-react';

interface SayHiButtonProps {
  onSayHi: () => void;
  timeLeft: number;
}

const SayHiButton: React.FC<SayHiButtonProps> = ({ onSayHi, timeLeft }) => {
  return (
    <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center z-50 px-6 gap-2">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="text-white font-mono text-sm bg-black/60 backdrop-blur-sm px-4 py-2 rounded-full"
      >
        {timeLeft}s to respond!
      </motion.div>
      
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 0.95 }}
        onClick={onSayHi}
        className="w-full max-w-sm bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white border-2 border-white/30 shadow-[0_0_40px_rgba(6,182,212,0.6)] rounded-2xl py-6 flex items-center justify-center gap-3 uppercase font-bold tracking-widest text-xl transition-all active:shadow-[0_0_60px_rgba(6,182,212,0.8)]"
      >
        <Hand className="w-8 h-8" />
        Say Hi!
      </motion.button>
    </div>
  );
};

export default SayHiButton;
