import React from 'react';
import { motion } from 'framer-motion';
import { Hand } from 'lucide-react';

interface WaveButtonProps {
  onWave: () => void;
  disabled?: boolean;
}

const WaveButton: React.FC<WaveButtonProps> = ({ onWave, disabled }) => {
  return (
    <div className="absolute bottom-8 left-0 right-0 flex justify-center z-50 px-6">
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onWave}
        disabled={disabled}
        className="w-full max-w-sm bg-cyan-600/90 backdrop-blur-sm hover:bg-cyan-500 text-white border-2 border-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.5)] rounded-2xl py-6 flex items-center justify-center gap-3 uppercase font-bold tracking-widest text-xl transition-all active:bg-cyan-700"
      >
        <Hand className="w-8 h-8 animate-pulse" />
        Wave Back
      </motion.button>
    </div>
  );
};

export default WaveButton;
